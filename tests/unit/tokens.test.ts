import { describe, it, expect, beforeAll } from 'vitest';

// Must be set before the module reads it.
beforeAll(() => {
  process.env.UNSUB_HMAC_SECRET = 'test-secret-not-a-real-key';
});

const { makeUnsubscribeToken, verifyUnsubscribeToken, generateConfirmationToken } =
  await import('@/lib/tokens');

describe('unsubscribe tokens', () => {
  it('verifies a token it just issued', () => {
    const token = makeUnsubscribeToken('user@example.com');
    expect(verifyUnsubscribeToken(token, 'user@example.com')).toBe(true);
  });

  it('normalizes case and surrounding whitespace on both sides', () => {
    const token = makeUnsubscribeToken('  User@Example.COM  ');
    expect(verifyUnsubscribeToken(token, 'user@example.com')).toBe(true);
    expect(verifyUnsubscribeToken(token, ' USER@EXAMPLE.com ')).toBe(true);
  });

  it('rejects a token issued for a different email', () => {
    const token = makeUnsubscribeToken('victim@example.com');
    expect(verifyUnsubscribeToken(token, 'attacker@example.com')).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const token = makeUnsubscribeToken('user@example.com');
    const [payload, sig] = token.split('.');
    const flipped = sig.slice(0, -1) + (sig.at(-1) === 'a' ? 'b' : 'a');
    expect(verifyUnsubscribeToken(`${payload}.${flipped}`, 'user@example.com')).toBe(false);
  });

  it('rejects a swapped payload with the original signature', () => {
    const token = makeUnsubscribeToken('victim@example.com');
    const sig = token.split('.')[1];
    const forgedPayload = Buffer.from('attacker@example.com').toString('base64url');
    expect(verifyUnsubscribeToken(`${forgedPayload}.${sig}`, 'attacker@example.com')).toBe(false);
  });

  it('rejects malformed tokens without throwing', () => {
    for (const bad of ['', '.', 'nodot', 'a.', '.b', 'a.b.c', 'zzz.notahexsignature']) {
      expect(() => verifyUnsubscribeToken(bad, 'user@example.com')).not.toThrow();
      expect(verifyUnsubscribeToken(bad, 'user@example.com')).toBe(false);
    }
  });

  it('rejects a signature of the wrong length (timingSafeEqual would throw)', () => {
    const token = makeUnsubscribeToken('user@example.com');
    const payload = token.split('.')[0];
    expect(verifyUnsubscribeToken(`${payload}.abcd`, 'user@example.com')).toBe(false);
  });
});

describe('confirmation tokens', () => {
  it('produces 64 hex chars (256 bits) and does not repeat', () => {
    const a = generateConfirmationToken();
    const b = generateConfirmationToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });
});
