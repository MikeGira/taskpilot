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

export const INJECTION_PATTERNS = [
  /ignore\s+(all\s+|previous\s+|above\s+|prior\s+)?instructions/i,
  /\[SYSTEM\]/i,
  /you\s+are\s+now\s+/i,
  /<\|im_start\|>/i,
  /forget\s+(everything|all|your\s+instructions)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /disregard\s+(your\s+|all\s+)?previous/i,
  /new\s+prompt:/i,
];

export function normalizeText(text: string): string {
  return text.normalize('NFKC').replace(/\s+/g, ' ');
}

export function containsInjection(text: string): boolean {
  return INJECTION_PATTERNS.some(p => p.test(normalizeText(text)));
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
