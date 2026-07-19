import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { withRetry } from '@/lib/utils';

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export function parseRequestBody<T>(
  raw: string,
  schema: z.ZodSchema<T>,
  maxBytes: number,
  validationError?: string,
): ParseResult<T> {
  if (raw.length > maxBytes) {
    return { ok: false, response: NextResponse.json({ error: 'Payload too large' }, { status: 413 }) };
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = validationError ?? parsed.error.issues[0]?.message ?? 'Invalid request';
    return { ok: false, response: NextResponse.json({ error: msg }, { status: 400 }) };
  }
  return { ok: true, data: parsed.data };
}

type RateLimitResult =
  | { ok: true; ip: string }
  | { ok: false; response: NextResponse };

export function checkRateLimit(
  request: Request,
  prefix: string,
  max: number,
  windowMs: number,
  errorMessage = 'Too many requests',
): RateLimitResult {
  const ip = getClientIp(request);
  if (!rateLimit(`${prefix}:${ip}`, max, windowMs).allowed) {
    return { ok: false, response: NextResponse.json({ error: errorMessage }, { status: 429 }) };
  }
  return { ok: true, ip };
}

export const ONE_HOUR_MS = 60 * 60 * 1000;

// Qualifier chain, not a single optional qualifier. The earlier `(all\s+|previous\s+)?`
// form matched exactly ONE qualifier, so stacking them walked straight past the filter:
// "ignore all previous instructions" — the single most common injection string there is —
// was NOT caught, while "ignore previous instructions" was. Same flaw applied to
// `disregard`. `*` over the alternation is what closes it.
// Deliberately excludes "rules" as an object noun: firewall/alert rules are ordinary
// TaskPilot task vocabulary, and a false positive costs a legitimate user their
// generation (this guard fails closed with a 400).
const QUALIFIERS = String.raw`(?:(?:all|any|the|your|previous|above|prior|earlier|preceding)\s+)*`;
const OVERRIDE_TARGET = String.raw`(?:instructions?|prompts?|directions?)`;

export const INJECTION_PATTERNS = [
  new RegExp(String.raw`ignore\s+${QUALIFIERS}${OVERRIDE_TARGET}`, 'i'),
  new RegExp(String.raw`disregard\s+${QUALIFIERS}(?:${OVERRIDE_TARGET}|previous)`, 'i'),
  new RegExp(String.raw`forget\s+(?:everything|all|${QUALIFIERS}${OVERRIDE_TARGET})`, 'i'),
  /\[SYSTEM\]/i,
  /you\s+are\s+now\s+/i,
  /<\|im_start\|>/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /new\s+prompt:/i,
];

export function normalizeText(text: string): string {
  return text.normalize('NFKC').replace(/\s+/g, ' ');
}

export function containsInjection(text: string): boolean {
  return INJECTION_PATTERNS.some(p => p.test(normalizeText(text)));
}

type FreeTextResult = { ok: true } | { ok: false; response: NextResponse };

// Shared free-text guard for the generation routes: filters empty inputs, runs the
// prompt-injection check, and returns a ready 400 response (with IP-truncated warn log)
// on a hit. Keeps the injection response identical across /generate and /workflow.
export function checkFreeTextInputs(
  inputs: (string | undefined | null)[],
  ip: string,
  logPrefix: string,
): FreeTextResult {
  const texts = inputs.filter(Boolean) as string[];
  if (texts.some(containsInjection)) {
    console.warn(`${logPrefix} prompt injection attempt from`, ip.slice(0, 8));
    return { ok: false, response: NextResponse.json({ error: 'Invalid input detected.' }, { status: 400 }) };
  }
  return { ok: true };
}

export function buildUserMessage(
  taskDescription: string,
  generateInstruction: string,
  clarificationAnswer?: string,
  previousQuestion?: string,
): string {
  if (clarificationAnswer && previousQuestion) {
    return `Original request: ${taskDescription}\n\nYou asked: ${previousQuestion}\nMy answer: ${clarificationAnswer}\n\n${generateInstruction}`;
  }
  return taskDescription;
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export type AnthropicResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'upstream' | 'timeout' | 'network'; status?: number };

// Single source of truth for Anthropic calls: bundles abort/timeout + retry so every
// caller gets consistent behaviour (and so no route can forget the timeout). The
// AbortController guarantees a hung upstream cannot block the function indefinitely.
export type AnthropicStreamResult =
  | { ok: true; stream: ReadableStream<Uint8Array> }
  | { ok: false; reason: 'upstream' | 'timeout' | 'network'; status?: number };

// Streaming variant of callAnthropic: returns a plain-text ReadableStream of the
// model's output (Anthropic SSE is decoded server-side so clients just read text).
// The timeout covers the entire stream, so a hung upstream aborts mid-stream too.
export async function callAnthropicStream(params: {
  apiKey: string;
  model: string;
  maxTokens: number;
  system: string;
  messages: { role: string; content: string }[];
  timeoutMs?: number;
  logPrefix: string;
}): Promise<AnthropicStreamResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 60000);
  try {
    const res = await withRetry(() =>
      fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': params.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: params.model,
          max_tokens: params.maxTokens,
          system: params.system,
          messages: params.messages,
          stream: true,
        }),
      })
    );
    if (!res.ok || !res.body) {
      clearTimeout(timeout);
      const errData = await res.json().catch(() => ({}));
      console.error(`${params.logPrefix} Anthropic error:`, res.status, errData);
      return { ok: false, reason: 'upstream', status: res.status };
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    // SSE lines can split across network chunks — buffer until a full line arrives.
    let buffer = '';
    const stream = res.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, out) {
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta.text) {
                out.enqueue(encoder.encode(event.delta.text));
              }
            } catch {
              // Ignore unparseable SSE payloads (pings, partial frames)
            }
          }
        },
        flush() {
          clearTimeout(timeout);
        },
      })
    );
    return { ok: true, stream };
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === 'AbortError') {
      console.error(`${params.logPrefix} request timed out`);
      return { ok: false, reason: 'timeout' };
    }
    console.error(`${params.logPrefix} Fetch error:`, err);
    return { ok: false, reason: 'network' };
  }
}

// Streams from Anthropic (keeping the connection alive) but ACCUMULATES the full text
// server-side and returns it in the same shape as callAnthropic — so a route can get a single
// buffered result without the non-streaming pitfalls.
//
// Why this exists: Anthropic explicitly warns against a large `max_tokens` on a non-streaming
// request ("Long requests" in the API error docs) — some networks drop the idle connection and the
// call fails/times out. The script/workflow generators use max_tokens 16384, which can run well
// past a non-streaming client timeout. Driving the request as a stream keeps bytes flowing
// (and lets a much longer timeout track the platform's maxDuration budget) while callers that only
// need the final text are unchanged. Ref: platform.claude.com API errors → Long requests;
// vercel.com function duration (Fluid Compute allows up to 300s, incl. Hobby).
export async function callAnthropicCollected(params: {
  apiKey: string;
  model: string;
  maxTokens: number;
  system: string;
  messages: { role: string; content: string }[];
  timeoutMs?: number;
  logPrefix: string;
}): Promise<AnthropicResult> {
  const result = await callAnthropicStream(params);
  if (!result.ok) return result;
  try {
    const reader = result.stream.getReader();
    const decoder = new TextDecoder();
    let text = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, text };
  } catch (err) {
    // The stream errors if the upstream aborts mid-generation (the timeout in callAnthropicStream
    // covers the whole stream). Surface it the same way the non-streaming path would.
    if ((err as Error).name === 'AbortError') {
      console.error(`${params.logPrefix} stream timed out`);
      return { ok: false, reason: 'timeout' };
    }
    console.error(`${params.logPrefix} stream read error:`, err);
    return { ok: false, reason: 'network' };
  }
}

export async function callAnthropic(params: {
  apiKey: string;
  model: string;
  maxTokens: number;
  system: string;
  messages: { role: string; content: string }[];
  timeoutMs?: number;
  logPrefix: string;
}): Promise<AnthropicResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 60000);
  try {
    const res = await withRetry(() =>
      fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': params.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: params.model,
          max_tokens: params.maxTokens,
          system: params.system,
          messages: params.messages,
        }),
      })
    );
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error(`${params.logPrefix} Anthropic error:`, res.status, errData);
      return { ok: false, reason: 'upstream', status: res.status };
    }
    const data = await res.json();
    return { ok: true, text: data.content?.[0]?.text ?? '' };
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      console.error(`${params.logPrefix} request timed out`);
      return { ok: false, reason: 'timeout' };
    }
    console.error(`${params.logPrefix} Fetch error:`, err);
    return { ok: false, reason: 'network' };
  } finally {
    clearTimeout(timeout);
  }
}
