import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

function getSecret(): string {
  const s = process.env.UNSUB_HMAC_SECRET;
  if (!s) throw new Error('UNSUB_HMAC_SECRET is not configured');
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

function verify(payload: string, signature: string): boolean {
  const expected = sign(payload);
  try {
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export function makeUnsubscribeToken(email: string): string {
  const normalized = email.toLowerCase().trim();
  const sig = sign(normalized);
  return `${Buffer.from(normalized).toString('base64url')}.${sig}`;
}

export function verifyUnsubscribeToken(token: string, email: string): boolean {
  const [encodedEmail, signature] = token.split('.');
  if (!encodedEmail || !signature) return false;
  const decoded = Buffer.from(encodedEmail, 'base64url').toString();
  if (decoded !== email.toLowerCase().trim()) return false;
  return verify(decoded, signature);
}

export function generateConfirmationToken(): string {
  return randomBytes(32).toString('hex');
}
