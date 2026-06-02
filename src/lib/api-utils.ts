import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

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
