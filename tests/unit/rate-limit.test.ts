import { describe, it, expect, vi, afterEach } from 'vitest';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

afterEach(() => {
  vi.useRealTimers();
});

// Each test uses a unique key — the limiter's store is module-level and shared.
let n = 0;
const key = () => `test-key-${n++}`;

describe('rateLimit', () => {
  it('allows up to the limit then blocks', () => {
    const k = key();
    expect(rateLimit(k, 3, 60_000)).toMatchObject({ allowed: true, remaining: 2 });
    expect(rateLimit(k, 3, 60_000)).toMatchObject({ allowed: true, remaining: 1 });
    expect(rateLimit(k, 3, 60_000)).toMatchObject({ allowed: true, remaining: 0 });
    expect(rateLimit(k, 3, 60_000)).toMatchObject({ allowed: false, remaining: 0 });
  });

  it('keeps blocking while the window is open', () => {
    const k = key();
    rateLimit(k, 1, 60_000);
    for (let i = 0; i < 5; i++) expect(rateLimit(k, 1, 60_000).allowed).toBe(false);
  });

  it('resets once the window expires', () => {
    vi.useFakeTimers();
    const k = key();
    rateLimit(k, 1, 60_000);
    expect(rateLimit(k, 1, 60_000).allowed).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect(rateLimit(k, 1, 60_000)).toMatchObject({ allowed: true, remaining: 0 });
  });

  it('tracks keys independently', () => {
    const a = key();
    const b = key();
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(b, 1, 60_000).allowed).toBe(true);
  });
});

describe('getClientIp', () => {
  const req = (headers: Record<string, string>) => new Request('https://x.test', { headers });

  it('prefers x-real-ip, which Vercel sets and clients cannot spoof', () => {
    expect(getClientIp(req({ 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '9.9.9.9' }))).toBe('1.1.1.1');
  });

  // x-forwarded-for is client-controlled at the FRONT. Taking the last entry is what
  // stops an attacker from minting a fresh rate-limit bucket per request by prepending
  // spoofed IPs. Any change that makes this read [0] reopens that bypass.
  it('falls back to the LAST x-forwarded-for entry, not the client-controlled first', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '9.9.9.9, 2.2.2.2' }))).toBe('2.2.2.2');
    expect(getClientIp(req({ 'x-forwarded-for': 'spoofed, spoofed2, 3.3.3.3' }))).toBe('3.3.3.3');
  });

  it('trims whitespace around the chosen entry', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '9.9.9.9,   4.4.4.4  ' }))).toBe('4.4.4.4');
  });

  it('returns "unknown" when no forwarding headers are present', () => {
    expect(getClientIp(req({}))).toBe('unknown');
  });
});
