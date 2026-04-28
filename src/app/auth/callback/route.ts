import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const redirectTarget = next.startsWith('/') ? next : '/dashboard';

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taskpilot-umber.vercel.app';
  const failUrl = `${siteUrl}/login?error=auth_failed`;
  const successUrl = `${siteUrl}${redirectTarget}`;

  if (!code) {
    return NextResponse.redirect(failUrl);
  }

  // Build the success response first so we can attach session cookies to it
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
          // Write session cookies directly onto the outgoing response
          cookiesToSet.forEach(({ name, value, options }) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            response.cookies.set(name, value, options as any)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback]', error.message);
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
