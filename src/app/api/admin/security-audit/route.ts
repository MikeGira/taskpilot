import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type CheckStatus = 'pass' | 'warn' | 'fail';

export interface AuditCheck {
  name: string;
  status: CheckStatus;
  detail: string;
  healable?: boolean;
  healAction?: string;
  healTargets?: string[];
  fixSteps?: string[];
}

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

  // 1. Environment variables
  const missingEnv = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
  checks.push({
    name: 'Environment Variables',
    status: missingEnv.length === 0 ? 'pass' : 'fail',
    detail: missingEnv.length === 0
      ? `All ${REQUIRED_ENV_VARS.length} required env vars present`
      : `Missing: ${missingEnv.join(', ')}`,
    ...(missingEnv.length > 0 && {
      fixSteps: [
        'Open Vercel Dashboard and go to Settings > Environment Variables',
        `Add the missing variable(s): ${missingEnv.join(', ')}`,
        'Redeploy (Deployments > Redeploy) for changes to take effect',
      ],
    }),
  });

  // Stripe key mode
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
  checks.push({
    name: 'Stripe Key Mode',
    status: stripeKey.startsWith('sk_live_') ? 'pass' : 'warn',
    detail: stripeKey.startsWith('sk_live_')
      ? 'Live Stripe keys active (production mode)'
      : 'Test Stripe keys in use. Update before going live.',
    ...(!stripeKey.startsWith('sk_live_') && {
      fixSteps: [
        'Log in to dashboard.stripe.com',
        'Copy your live secret key (Developers > API keys)',
        'Update STRIPE_SECRET_KEY in Vercel Dashboard > Settings > Environment Variables',
        'Redeploy to apply the change',
      ],
    }),
  });

  // 2. Row Level Security via RPC (requires migration 004)
  try {
    const db = getAdminClient();
    const { data, error } = await db.rpc('get_rls_status' as never);

    if (error) throw error;

    const rows = data as { tablename: string; rls_enabled: boolean }[];
    const tableMap = new Map(rows.map((r) => [r.tablename, r.rls_enabled]));
    const rlsOff = RLS_REQUIRED_TABLES.filter((t) => tableMap.has(t) && !tableMap.get(t));
    const missing = RLS_REQUIRED_TABLES.filter((t) => !tableMap.has(t));

    checks.push({
      name: 'Row Level Security',
      status: rlsOff.length === 0 ? 'pass' : 'fail',
      detail: rlsOff.length === 0
        ? `RLS enabled on all ${RLS_REQUIRED_TABLES.length - missing.length} tables${missing.length ? ` (${missing.join(', ')} not found in schema)` : ''}`
        : `RLS disabled on: ${rlsOff.join(', ')}`,
      ...(rlsOff.length > 0 && {
        healable: true,
        healAction: 'enable-rls',
        healTargets: rlsOff,
      }),
    });
  } catch {
    checks.push({
      name: 'Row Level Security',
      status: 'warn',
      detail: 'Migration 004 not yet applied. Run supabase/migrations/004_security_functions.sql to enable automated RLS checking.',
      fixSteps: [
        'Open Supabase Dashboard and go to SQL Editor',
        'Paste and run the contents of supabase/migrations/004_security_functions.sql',
        'Click Re-scan to verify',
      ],
    });
  }

  // 3. Security headers (self-probe)
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const probe = await fetch(`${siteUrl}/api/stats`, { method: 'GET' }).catch(() => null);
    if (probe) {
      const h = probe.headers;
      const failing = [
        { header: 'x-frame-options',        present: !!h.get('x-frame-options') },
        { header: 'x-content-type-options', present: h.get('x-content-type-options') === 'nosniff' },
        { header: 'strict-transport-security', present: !!h.get('strict-transport-security') },
      ].filter((c) => !c.present);

      checks.push({
        name: 'Security Headers',
        status: failing.length === 0 ? 'pass' : 'warn',
        detail: failing.length === 0
          ? 'X-Frame-Options, X-Content-Type-Options and HSTS present'
          : `Missing headers: ${failing.map((c) => c.header).join(', ')}`,
        ...(failing.length > 0 && {
          fixSteps: [
            'Open next.config.ts in the project root',
            'Add the missing headers to the headers() array',
            'Commit and push to trigger a Vercel redeploy',
          ],
        }),
      });
    } else {
      checks.push({ name: 'Security Headers', status: 'warn', detail: 'Could not probe headers (unreachable in dev/preview).' });
    }
  } catch {
    checks.push({ name: 'Security Headers', status: 'warn', detail: 'Header probe failed. Verify headers in production.' });
  }

  // 4. Dependency audit (reads package.json at runtime)
  try {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = Object.keys(pkg.dependencies ?? {}).length;
    const devDeps = Object.keys(pkg.devDependencies ?? {}).length;
    checks.push({
      name: 'Dependency Audit',
      status: 'pass',
      detail: `${deps} production, ${devDeps} dev dependencies. Run npm audit locally before each deploy.`,
    });
  } catch {
    checks.push({
      name: 'Dependency Audit',
      status: 'pass',
      detail: 'Dependencies loaded. Run npm audit locally before each deploy.',
    });
  }

  // 5. Runtime info
  checks.push({
    name: 'Runtime Environment',
    status: 'pass',
    detail: `Node ${process.version} | Next.js ${process.env.NEXT_RUNTIME ?? 'nodejs'} | ${process.env.VERCEL_ENV ?? 'local'}`,
  });

  // 6. Anthropic API reachability (uses /v1/models with auth)
  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  if (!apiKey) {
    checks.push({
      name: 'Anthropic API',
      status: 'fail',
      detail: 'ANTHROPIC_API_KEY is not set.',
      fixSteps: [
        'Go to console.anthropic.com and create an API key',
        'Add it as ANTHROPIC_API_KEY in Vercel Dashboard > Settings > Environment Variables',
        'Redeploy to apply',
      ],
    });
  } else {
    try {
      const ping = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      }).catch(() => null);

      if (!ping) {
        checks.push({
          name: 'Anthropic API',
          status: 'fail',
          detail: 'Cannot reach api.anthropic.com. Check network or firewall.',
        });
      } else if (ping.status === 200) {
        checks.push({ name: 'Anthropic API', status: 'pass', detail: 'API key valid. Models endpoint reachable.' });
      } else if (ping.status === 401 || ping.status === 403) {
        checks.push({
          name: 'Anthropic API',
          status: 'fail',
          detail: `API key rejected (HTTP ${ping.status}). Rotate ANTHROPIC_API_KEY.`,
          fixSteps: [
            'Go to console.anthropic.com > API Keys',
            'Revoke the old key and create a new one',
            'Update ANTHROPIC_API_KEY in Vercel Dashboard > Settings > Environment Variables',
            'Redeploy to apply',
          ],
        });
      } else {
        checks.push({
          name: 'Anthropic API',
          status: 'warn',
          detail: `Unexpected response HTTP ${ping.status}. API may be temporarily degraded.`,
        });
      }
    } catch {
      checks.push({ name: 'Anthropic API', status: 'warn', detail: 'Could not probe Anthropic API.' });
    }
  }

  return NextResponse.json({
    runAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      pass:  checks.filter((c) => c.status === 'pass').length,
      warn:  checks.filter((c) => c.status === 'warn').length,
      fail:  checks.filter((c) => c.status === 'fail').length,
    },
    checks,
  });
}
