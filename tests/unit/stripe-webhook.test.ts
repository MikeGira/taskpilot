import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Stripe from 'stripe';

const WEBHOOK_SECRET = 'whsec_test_secret_not_real';

process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.STRIPE_SECRET_KEY = 'sk_test_not_real';
process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test';

// Signature verification is exercised for real (Stripe's own generateTestHeaderString
// + constructEvent). Only the DB and email side effects are doubled — mocking the
// verification itself would test nothing worth testing.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true });

const upsert = vi.fn();
const maybeSingle = vi.fn();
const sendEmail = vi.fn();
const logEmailMock = vi.fn();

const dbFrom = vi.fn((table: string) => {
  if (table === 'products') {
    return { select: () => ({ eq: () => ({ maybeSingle }) }) };
  }
  return { upsert };
});

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: dbFrom }),
}));

vi.mock('@/lib/resend', () => ({
  getResend: () => ({ emails: { send: sendEmail } }),
  FROM: 'test@example.test',
  logEmail: (...args: unknown[]) => logEmailMock(...args),
}));

vi.mock('@/lib/stripe', () => ({
  getStripe: () => stripe,
}));

const { POST } = await import('@/app/api/webhook/stripe/route');

function signedRequest(event: unknown, opts: { secret?: string; timestamp?: number } = {}) {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: opts.secret ?? WEBHOOK_SECRET,
    timestamp: opts.timestamp,
  });
  return new Request('https://example.test/api/webhook/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': header, 'content-type': 'application/json' },
    body: payload,
  });
}

const checkoutEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'evt_test_1',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_123',
      customer_email: 'buyer@example.com',
      customer: 'cus_test_1',
      amount_total: 1900,
      currency: 'usd',
      metadata: { product_slug: 'it-helpdesk-starter-kit', user_id: 'user-1' },
      ...overrides,
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  maybeSingle.mockResolvedValue({ data: { id: 'prod-1' }, error: null });
  upsert.mockResolvedValue({ error: null });
  sendEmail.mockResolvedValue({ id: 'email-1' });
  logEmailMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('signature verification', () => {
  it('rejects a request with no stripe-signature header', async () => {
    const res = await POST(new Request('https://example.test', { method: 'POST', body: '{}' }));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects a signature produced with the wrong secret', async () => {
    const res = await POST(signedRequest(checkoutEvent(), { secret: 'whsec_attacker_secret' }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Invalid signature' });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects a replayed signature outside the timestamp tolerance', async () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 60 * 60;
    const res = await POST(signedRequest(checkoutEvent(), { timestamp: oldTimestamp }));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  // The body must be verified as raw bytes. If anyone reintroduces JSON parsing before
  // constructEvent, the signature over the re-serialized payload stops matching and
  // this test goes red.
  it('rejects when the body was mutated after signing', async () => {
    const event = checkoutEvent();
    const header = stripe.webhooks.generateTestHeaderString({
      payload: JSON.stringify(event),
      secret: WEBHOOK_SECRET,
    });
    const tampered = new Request('https://example.test', {
      method: 'POST',
      headers: { 'stripe-signature': header },
      body: JSON.stringify({ ...event, data: { object: { amount_total: 1 } } }),
    });
    expect((await POST(tampered)).status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('accepts a correctly signed event', async () => {
    const res = await POST(signedRequest(checkoutEvent()));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true });
  });

  // Fails closed: with no secret configured every event is unverifiable, so the route
  // must refuse rather than fall through and trust the payload.
  it('refuses to process anything when STRIPE_WEBHOOK_SECRET is unset', async () => {
    const saved = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    try {
      const res = await POST(signedRequest(checkoutEvent(), { secret: saved }));
      expect(res.status).toBe(500);
      expect(upsert).not.toHaveBeenCalled();
    } finally {
      process.env.STRIPE_WEBHOOK_SECRET = saved;
    }
  });
});

describe('checkout.session.completed handling', () => {
  it('records the purchase keyed on the stripe session id', async () => {
    await POST(signedRequest(checkoutEvent()));
    expect(upsert).toHaveBeenCalledTimes(1);
    const [row, options] = upsert.mock.calls[0];
    expect(row).toMatchObject({
      email: 'buyer@example.com',
      user_id: 'user-1',
      product_id: 'prod-1',
      product_slug: 'it-helpdesk-starter-kit',
      stripe_session_id: 'cs_test_123',
      amount_cents: 1900,
      currency: 'usd',
      status: 'completed',
    });
    // Idempotency key — without this, Stripe's retries would duplicate purchases.
    expect(options).toEqual({ onConflict: 'stripe_session_id' });
  });

  it('is idempotent across a Stripe retry of the same event', async () => {
    const req1 = signedRequest(checkoutEvent());
    const req2 = signedRequest(checkoutEvent());
    expect((await POST(req1)).status).toBe(200);
    expect((await POST(req2)).status).toBe(200);
    const sessionIds = upsert.mock.calls.map(([row]) => row.stripe_session_id);
    expect(sessionIds).toEqual(['cs_test_123', 'cs_test_123']);
  });

  it('falls back to customer_details.email when customer_email is absent', async () => {
    await POST(signedRequest(checkoutEvent({
      customer_email: null,
      customer_details: { email: 'fallback@example.com' },
    })));
    expect(upsert.mock.calls[0][0].email).toBe('fallback@example.com');
  });

  it('records a null user_id for guest checkouts', async () => {
    await POST(signedRequest(checkoutEvent({ metadata: { product_slug: 'it-helpdesk-starter-kit' } })));
    expect(upsert.mock.calls[0][0].user_id).toBeNull();
  });

  it('sends the confirmation email with a session-scoped download link', async () => {
    await POST(signedRequest(checkoutEvent()));
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const sent = sendEmail.mock.calls[0][0];
    expect(sent.to).toEqual(['buyer@example.com']);
    expect(sent.html).toContain('/api/download/session?session_id=cs_test_123');
    expect(logEmailMock).toHaveBeenCalled();
  });

  it('logs unhandled event types but still acks with 200', async () => {
    const res = await POST(signedRequest({
      id: 'evt_2',
      type: 'payment_intent.succeeded',
      data: { object: {} },
    }));
    expect(res.status).toBe(200);
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe('failure behaviour', () => {
  // The 200-vs-500 split is the whole retry contract: 200 tells Stripe "done, stop",
  // 500 tells it "our fault, keep retrying for 3 days". Getting this backwards silently
  // loses paid purchases — the exact failure mode of the 2026-07-02 Supabase pause.
  it('returns 500 so Stripe retries when the purchase upsert fails', async () => {
    upsert.mockResolvedValue({ error: { message: 'db exploded' } });
    const res = await POST(signedRequest(checkoutEvent()));
    expect(res.status).toBe(500);
  });

  it('returns 500 so Stripe retries when the product lookup errors', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'connection refused' } });
    const res = await POST(signedRequest(checkoutEvent()));
    expect(res.status).toBe(500);
    expect(upsert).not.toHaveBeenCalled();
  });

  // A missing product row is a config problem, not a transient one — retrying for
  // 3 days would not fix it, so this must ack rather than 500.
  it('acks with 200 when the product genuinely does not exist', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(signedRequest(checkoutEvent()));
    expect(res.status).toBe(200);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('acks with 200 and records nothing when the session carries no email', async () => {
    const res = await POST(signedRequest(checkoutEvent({
      customer_email: null,
      customer_details: null,
    })));
    expect(res.status).toBe(200);
    expect(upsert).not.toHaveBeenCalled();
  });

  // Email is best-effort: the purchase is already durable, so a Resend outage must not
  // cause a 500 that makes Stripe replay the whole event.
  it('still returns 200 when the confirmation email fails to send', async () => {
    sendEmail.mockRejectedValue(new Error('resend down'));
    const res = await POST(signedRequest(checkoutEvent()));
    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
