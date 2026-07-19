import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The post-purchase download link from the confirmation email. Verifies payment with
// Stripe, resolves the file, and redirects to a signed URL. Stripe, Supabase admin, and
// email are doubled.

let stripeThrows: boolean;
let retrieveThrows: boolean;
let session: Record<string, unknown>;
let adminThrows: boolean;
let productsResult: unknown;
let existingPurchase: unknown;
let signedUrlFor: (p: string) => { data: { signedUrl: string } | null; error: { message: string } | null } | Promise<never>;

const upsertCalls: Record<string, unknown>[] = [];
const sendEmail = vi.fn();

const THROW = Symbol('throw');
function settle(result: unknown) {
  if (result === THROW) return Promise.reject(new TypeError('fetch failed'));
  return Promise.resolve(result);
}

function adminFrom(table: string) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => settle(table === 'products' ? productsResult : existingPurchase),
    upsert: (row: Record<string, unknown>) => { upsertCalls.push(row); return Promise.resolve({ error: null }); },
  };
  return chain;
}
const adminClient = {
  from: adminFrom,
  storage: { from: () => ({ createSignedUrl: (p: string) => Promise.resolve(signedUrlFor(p)) }) },
};

vi.mock('@/lib/stripe', () => ({
  getStripe: () => {
    if (stripeThrows) throw new Error('STRIPE_SECRET_KEY missing');
    return { checkout: { sessions: { retrieve: async () => { if (retrieveThrows) throw new Error('no such session'); return session; } } } };
  },
}));
vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => { if (adminThrows) throw new Error('no service role key'); return adminClient; },
}));
vi.mock('@/lib/resend', () => ({
  getResend: () => ({ emails: { send: sendEmail } }),
  FROM: 'test@example.test',
  logEmail: vi.fn(async () => {}),
}));
vi.mock('@/emails/purchase-confirmation', () => ({
  renderPurchaseConfirmationEmail: () => ({ html: '<p>thanks</p>', subject: 'Your download' }),
}));

const { GET } = await import('@/app/api/download/session/route');

const paidSession = () => ({
  id: 'cs_test_1',
  payment_status: 'paid',
  customer_email: 'buyer@example.com',
  customer: 'cus_1',
  amount_total: 1900,
  currency: 'usd',
  metadata: { product_slug: 'it-helpdesk-starter-kit' },
});

const call = (sessionId = 'cs_test_1') =>
  GET(new Request(`https://x.test/api/download/session?session_id=${sessionId}`));

const REDIRECT = [301, 302, 303, 307, 308];

beforeEach(() => {
  vi.clearAllMocks();
  upsertCalls.length = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  stripeThrows = false;
  retrieveThrows = false;
  adminThrows = false;
  session = paidSession();
  productsResult = { data: { id: 'prod-1', storage_path: 'products/kit.zip' }, error: null };
  existingPurchase = { data: { id: 'purchase-1' }, error: null };
  signedUrlFor = () => ({ data: { signedUrl: 'https://signed.example/kit.zip?token=abc' }, error: null });
  sendEmail.mockResolvedValue({ id: 'email-1' });
});

afterEach(() => vi.restoreAllMocks());

describe('input + payment gate', () => {
  it.each(['', 'nope', 'pi_123', 'cs'])('rejects a non-cs_ session id %j with 400', async (id) => {
    const res = await call(id);
    expect(res.status).toBe(400);
  });

  it('returns 404 when Stripe cannot retrieve the session', async () => {
    retrieveThrows = true;
    expect((await call()).status).toBe(404);
  });

  it('returns 403 when the session is not paid', async () => {
    session = { ...paidSession(), payment_status: 'unpaid' };
    const res = await call();
    expect(res.status).toBe(403);
    expect(upsertCalls).toHaveLength(0);
  });
});

describe('happy path', () => {
  it('redirects to the signed URL for a paid session', async () => {
    const res = await call();
    expect(REDIRECT).toContain(res.status);
    expect(res.headers.get('location')).toBe('https://signed.example/kit.zip?token=abc');
  });
});

describe('service failures fail safe (no silent success)', () => {
  it('returns 503 when Stripe is not configured', async () => {
    stripeThrows = true;
    expect((await call()).status).toBe(503);
  });

  it('returns 503 when the admin client cannot be created', async () => {
    adminThrows = true;
    expect((await call()).status).toBe(503);
  });

  it('returns 503 when the product lookup errors', async () => {
    productsResult = { data: null, error: { message: 'connection refused' } };
    expect((await call()).status).toBe(503);
  });

  it('returns 503 when the product lookup is unreachable', async () => {
    productsResult = THROW;
    expect((await call()).status).toBe(503);
  });

  it('returns 404 when the product row does not exist', async () => {
    productsResult = { data: null, error: null };
    expect((await call()).status).toBe(404);
  });

  it('returns 503 when storage is unreachable', async () => {
    signedUrlFor = () => Promise.reject(new TypeError('fetch failed')) as Promise<never>;
    expect((await call()).status).toBe(503);
  });

  it('returns 500 when no signed URL can be produced', async () => {
    signedUrlFor = () => ({ data: null, error: { message: 'not found' } });
    expect((await call()).status).toBe(500);
  });
});

describe('email fallback (webhook may not have fired)', () => {
  it('sends the confirmation email when there is no existing purchase record', async () => {
    existingPurchase = { data: null, error: null };
    await call();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].to).toEqual(['buyer@example.com']);
  });

  it('does NOT resend the email when the purchase already exists', async () => {
    existingPurchase = { data: { id: 'purchase-1' }, error: null };
    await call();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('still redirects when the fallback email fails', async () => {
    existingPurchase = { data: null, error: null };
    sendEmail.mockRejectedValue(new Error('resend down'));
    const res = await call();
    expect(REDIRECT).toContain(res.status);
  });

  it('still redirects when the backfill lookup throws (non-fatal)', async () => {
    existingPurchase = THROW;
    const res = await call();
    expect(REDIRECT).toContain(res.status);
  });

  it('skips backfill entirely when the session has no customer email', async () => {
    session = { ...paidSession(), customer_email: null, customer_details: null };
    const res = await call();
    expect(REDIRECT).toContain(res.status);
    expect(upsertCalls).toHaveLength(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
