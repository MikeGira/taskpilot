import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Ensure profile row exists for new users
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { getAdminClient } = await import('@/lib/supabase/admin');
    const db = getAdminClient();
    await db.from('profiles').upsert(
      { id: user.id, email: user.email!, updated_at: new Date().toISOString() },
      { onConflict: 'id', ignoreDuplicates: false }
    );
  }

  const redirectTarget = next.startsWith('/') ? next : '/dashboard';
  return NextResponse.redirect(`${origin}${redirectTarget}`);
}
