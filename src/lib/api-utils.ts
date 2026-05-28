import { NextResponse } from 'next/server';
import { z } from 'zod';

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
