import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code       = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type       = searchParams.get('type') as EmailOtpType | null;
  const next       = searchParams.get('next') ?? '/dashboard';
  const redirectTarget = next.startsWith('/') ? next : '/dashboard';

  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taskpilot-umber.vercel.app';
  const failUrl    = `${siteUrl}/login?error=auth_failed`;
  const successUrl = `${siteUrl}${redirectTarget}`;

  // Reject immediately if neither auth param is present
  if (!code && !token_hash) {
    return NextResponse.redirect(failUrl);
  }

  // Pre-create the redirect so the cookie setAll closure can attach session cookies to it
  const response = NextResponse.redirect(successUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value, options }) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            response.cookies.set(name, value, options as any)
          );
        },
      },
    }
  );

  // Handle both Supabase auth flows:
  // token_hash — email OTP / magic link (no PKCE cookie needed, works across browsers)
  // code       — PKCE exchange (requires code_verifier cookie from the same browser session)
  let authError: { message: string } | null = null;

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    authError = error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
  }

  if (authError) {
    console.error('[auth/callback]', authError.message);
    return NextResponse.redirect(failUrl);
  }

  // Best-effort profile upsert — never let this crash the auth flow
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { getAdminClient } = await import('@/lib/supabase/admin');
      const db = getAdminClient();
      await db.from('profiles').upsert(
        { id: user.id, email: user.email!, updated_at: new Date().toISOString() },
        { onConflict: 'id', ignoreDuplicates: false }
      );
    }
  } catch (err) {
    console.error('[auth/callback] profile upsert (non-fatal):', err);
  }

  return response;
}
