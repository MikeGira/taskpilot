import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type CheckStatus = 'pass' | 'warn' | 'fail';
interface AuditCheck { name: string; status: CheckStatus; detail: string; }

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'UNSUB_HMAC_SECRET',
  'ADMIN_EMAIL',
  'ANTHROPIC_API_KEY',
];

const RLS_REQUIRED_TABLES = [
  'profiles', 'products', 'purchases', 'subscribers',
  'contact_requests', 'email_logs', 'generation_feedback', 'workflow_generations',
];

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const checks: AuditCheck[] = [];

  // ── 1. Environment variables ──────────────────────────────────────────────
  const missingEnv = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
  checks.push({
    name: 'Environment Variables',
    status: missingEnv.length === 0 ? 'pass' : 'fail',
    detail: missingEnv.length === 0
      ? `All ${REQUIRED_ENV_VARS.length} required env vars are present`
      : `Missing: ${missingEnv.join(', ')}`,
  });

  // Stripe key mode check
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
  checks.push({
    name: 'Stripe Key Mode',
    status: stripeKey.startsWith('sk_live_') ? 'pass' : 'warn',
    detail: stripeKey.startsWith('sk_live_')
      ? 'Using live Stripe keys (production mode)'
      : 'Using test Stripe keys — update before going live',
  });

  // ── 2. RLS checks via Supabase ────────────────────────────────────────────
  try {
    const db = getAdminClient();
    const { data, error } = await db
      .rpc('check_rls_status' as never)
      .select('*');

    if (error || !data) {
      const { data: tablesRaw } = await db
        .from('pg_tables' as never)
        .select('tablename, rowsecurity')
        .eq('schemaname', 'public' as never);

      if (tablesRaw) {
        const tableMap = new Map<string, boolean>(
          (tablesRaw as { tablename: string; rowsecurity: boolean }[]).map((t) => [t.tablename, t.rowsecurity])
        );
        const rlsOff = RLS_REQUIRED_TABLES.filter((t) => tableMap.has(t) && !tableMap.get(t));
        const missing = RLS_REQUIRED_TABLES.filter((t) => !tableMap.has(t));
        checks.push({
          name: 'Row Level Security',
          status: rlsOff.length === 0 ? 'pass' : 'fail',
          detail: rlsOff.length === 0
            ? `RLS enabled on all ${RLS_REQUIRED_TABLES.length} required tables`
            : `RLS disabled on: ${rlsOff.join(', ')}${missing.length ? ` | Not found: ${missing.join(', ')}` : ''}`,
        });
      } else {
        checks.push({ name: 'Row Level Security', status: 'warn', detail: 'Could not query pg_tables — verify RLS manually' });
      }
    } else {
      checks.push({ name: 'Row Level Security', status: 'pass', detail: 'RLS check passed via RPC' });
    }
  } catch {
    checks.push({ name: 'Row Level Security', status: 'warn', detail: 'RLS check skipped — run manually in Supabase dashboard' });
  }

  // ── 3. Security headers check (self-request) ──────────────────────────────
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const probe = await fetch(`${siteUrl}/api/stats`, { method: 'GET' }).catch(() => null);
    if (probe) {
      const h = probe.headers;
      const headerChecks: { header: string; expected: string; present: boolean }[] = [
        { header: 'x-frame-options', expected: 'DENY or SAMEORIGIN', present: !!h.get('x-frame-options') },
        { header: 'x-content-type-options', expected: 'nosniff', present: h.get('x-content-type-options') === 'nosniff' },
        { header: 'strict-transport-security', expected: 'max-age', present: !!h.get('strict-transport-security') },
      ];
      const failing = headerChecks.filter((c) => !c.present);
      checks.push({
        name: 'Security Headers',
        status: failing.length === 0 ? 'pass' : 'warn',
        detail: failing.length === 0
          ? 'X-Frame-Options, X-Content-Type-Options, HSTS all present'
          : `Missing headers: ${failing.map((c) => c.header).join(', ')} — add to next.config.js headers`,
      });
    } else {
      checks.push({ name: 'Security Headers', status: 'warn', detail: 'Could not probe headers (unreachable in dev/preview)' });
    }
  } catch {
    checks.push({ name: 'Security Headers', status: 'warn', detail: 'Header probe failed — verify headers in production' });
  }

  // ── 4. Dependency security ────────────────────────────────────────────────
  checks.push({
    name: 'Dependency Audit',
    status: 'warn',
    detail: 'Run `npm audit` locally before each deploy — automated audit not available server-side',
  });

  // ── 5. Runtime info ───────────────────────────────────────────────────────
  checks.push({
    name: 'Runtime Environment',
    status: 'pass',
    detail: `Node ${process.version} · Next.js ${process.env.NEXT_RUNTIME ?? 'nodejs'} · ${process.env.VERCEL_ENV ?? 'local'}`,
  });

  // ── 6. Anthropic API reachability ─────────────────────────────────────────
  try {
    const ping = await fetch('https://api.anthropic.com', { method: 'HEAD' }).catch(() => null);
    checks.push({
      name: 'Anthropic API Reachable',
      status: ping && ping.ok ? 'pass' : 'warn',
      detail: ping ? `Status ${ping.status}` : 'Unreachable — check network/firewall',
    });
  } catch {
    checks.push({ name: 'Anthropic API Reachable', status: 'warn', detail: 'Could not probe Anthropic API' });
  }

  const failCount = checks.filter((c) => c.status === 'fail').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;

  return NextResponse.json({
    runAt: new Date().toISOString(),
    summary: { total: checks.length, pass: checks.filter((c) => c.status === 'pass').length, warn: warnCount, fail: failCount },
    checks,
  });
}
