import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ONE_HOUR_MS } from '@/lib/api-utils';
import { rateLimit } from '@/lib/rate-limit';

// Access-control + money path. Auth, Supabase admin, and Stripe are doubled; the DB
// query builder records its calls so we can assert the AUTHORIZATION filter is actually
// applied (a user must not be able to fetch another user's product).

let authUser: { id: string | null; email: string | null } | null;
let purchasesResult: unknown;      // result of the purchases join .maybeSingle()
let productsResult: unknown;       // result of the products .maybeSingle()
let signedUrlFor: (path: string) => { data: { signedUrl: string } | null; error: { message: string } | null } | Promise<never>;
let stripeCustomers: unknown[];
let stripeSessions: unknown[];

const queryLog: { table: string; method: string; args: unknown[] }[] = [];
const upsertCalls: { table: string; row: Record<string, unknown> }[] = [];

const THROW = Symbol('throw');
function settle(result: unknown) {
  if (result === THROW) return Promise.reject(new TypeError('fetch failed'));
  return Promise.resolve(result);
}

function adminFrom(table: string) {
  const chain: Record<string, unknown> = {
    select: (...a: unknown[]) => { queryLog.push({ table, method: 'select', args: a }); return chain; },
    eq: (...a: unknown[]) => { queryLog.push({ table, method: 'eq', args: a }); return chain; },
    or: (...a: unknown[]) => { queryLog.push({ table, method: 'or', args: a }); return chain; },
    maybeSingle: () => settle(table === 'purchases' ? purchasesResult : productsResult),
    upsert: (row: Record<string, unknown>) => { upsertCalls.push({ table, row }); return Promise.resolve({ error: null }); },
  };
  return chain;
}

const adminClient = {
  from: adminFrom,
  storage: { from: () => ({ createSignedUrl: (p: string) => Promise.resolve(signedUrlFor(p)) }) },
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: authUser } })) },
  })),
}));
vi.mock('@/lib/supabase/admin', () => ({ getAdminClient: () => adminClient }));
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    customers: { list: vi.fn(async () => ({ data: stripeCustomers })) },
    checkout: { sessions: { list: vi.fn(async () => ({ data: stripeSessions })) } },
  }),
}));

const { GET } = await import('@/app/api/download/[product]/route');

const SLUG = 'it-helpdesk-starter-kit';
let ipCounter = 0;
function req(ip = `10.9.${ipCounter++}.1`) {
  return new Request(`https://x.test/api/download/${SLUG}`, { headers: { 'x-real-ip': ip } });
}
const params = Promise.resolve({ product: SLUG });
const call = (r = req()) => GET(r, { params });

beforeEach(() => {
  vi.clearAllMocks();
  queryLog.length = 0;
  upsertCalls.length = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  authUser = { id: 'user-1', email: 'buyer@example.com' };
  purchasesResult = { data: { id: 'purchase-1', products: { storage_path: 'products/kit.zip' } }, error: null };
  productsResult = { data: { id: 'prod-1', storage_path: 'products/kit.zip' }, error: null };
  signedUrlFor = () => ({ data: { signedUrl: 'https://signed.example/kit.zip?token=abc' }, error: null });
  stripeCustomers = [];
  stripeSessions = [];
});

afterEach(() => vi.restoreAllMocks());

describe('auth gate', () => {
  it('returns 401 when unauthenticated', async () => {
    authUser = null;
    const res = await call();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'Authentication required' });
  });

  it('returns 401 when the user has no email', async () => {
    authUser = { id: 'user-1', email: null };
    expect((await call()).status).toBe(401);
  });
});

describe('authorization filter', () => {
  it('scopes the purchase lookup to the caller (product_slug + completed + their id/email)', async () => {
    await call();
    const purchaseEqs = queryLog.filter(q => q.table === 'purchases' && q.method === 'eq');
    expect(purchaseEqs).toEqual(expect.arrayContaining([
      { table: 'purchases', method: 'eq', args: ['product_slug', SLUG] },
      { table: 'purchases', method: 'eq', args: ['status', 'completed'] },
    ]));
    const or = queryLog.find(q => q.table === 'purchases' && q.method === 'or');
    // The OR must constrain to THIS user — by id and/or email, never unfiltered.
    expect(or).toBeTruthy();
    expect(or!.args[0]).toContain('user_id.eq.user-1');
    expect(or!.args[0]).toContain('email.eq.buyer@example.com');
  });
});

describe('happy path', () => {
  it('returns a signed URL for a user who owns a completed purchase', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ url: 'https://signed.example/kit.zip?token=abc' });
  });
});

describe('Stripe fallback when no DB record', () => {
  beforeEach(() => { purchasesResult = { data: null, error: null }; });

  it('returns 403 when neither a DB purchase nor a paid Stripe session exists', async () => {
    stripeCustomers = [];
    const res = await call();
    expect(res.status).toBe(403);
  });

  it('backfills and returns a signed URL when a paid Stripe session is found', async () => {
    stripeCustomers = [{ id: 'cus_1' }];
    stripeSessions = [{ id: 'cs_1', payment_status: 'paid', amount_total: 1900, metadata: { product_slug: SLUG } }];
    const res = await call();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ url: 'https://signed.example/kit.zip?token=abc' });
    // The recovered purchase is written back so the dashboard works next time.
    const backfill = upsertCalls.find(u => u.table === 'purchases');
    expect(backfill?.row).toMatchObject({ email: 'buyer@example.com', stripe_session_id: 'cs_1', status: 'completed' });
  });

  it('accepts a paid session that carries no product_slug metadata', async () => {
    stripeCustomers = [{ id: 'cus_1' }];
    stripeSessions = [{ id: 'cs_2', payment_status: 'paid', amount_total: null, metadata: {} }];
    expect((await call()).status).toBe(200);
  });

  it('returns 403 when the customer has only unpaid sessions', async () => {
    stripeCustomers = [{ id: 'cus_1' }];
    stripeSessions = [{ id: 'cs_3', payment_status: 'unpaid', metadata: { product_slug: SLUG } }];
    expect((await call()).status).toBe(403);
  });

  it('returns 403 when the Stripe fallback itself throws', async () => {
    stripeCustomers = [{ id: 'cus_1' }];
    stripeSessions = 'boom' as unknown as unknown[]; // sessions.list().data not iterable → caught
    expect((await call()).status).toBe(403);
  });
});

describe('infrastructure failures', () => {
  it('returns 503 when the purchase lookup is unreachable', async () => {
    purchasesResult = THROW;
    expect((await call()).status).toBe(503);
  });

  it('returns 503 when storage is unreachable', async () => {
    signedUrlFor = () => Promise.reject(new TypeError('fetch failed')) as Promise<never>;
    expect((await call()).status).toBe(503);
  });

  it('returns 500 when a storage path resolves but no signed URL can be produced', async () => {
    signedUrlFor = () => ({ data: null, error: { message: 'Object not found' } });
    expect((await call()).status).toBe(500);
  });
});

describe('rate limiting', () => {
  it('returns 429 after the per-IP hourly limit is exhausted', async () => {
    const ip = '10.55.55.55';
    for (let i = 0; i < 10; i++) rateLimit(`download:${ip}`, 10, ONE_HOUR_MS);
    const res = await call(req(ip));
    expect(res.status).toBe(429);
  });
});
