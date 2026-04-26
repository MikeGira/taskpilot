import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const db = getAdminClient();

  const [profileResult, purchasesResult, subscriberResult] = await Promise.all([
    db.from('profiles').select('email, full_name, gdpr_consent_at, created_at').eq('id', user.id).maybeSingle(),
    db.from('purchases').select('product_slug, amount_cents, currency, status, created_at').or(`user_id.eq.${user.id},email.eq.${user.email}`),
    db.from('subscribers').select('email, confirmed, confirmed_at, source, created_at').eq('email', user.email!).maybeSingle(),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    profile: profileResult.data ?? { email: user.email },
    purchases: purchasesResult.data ?? [],
    newsletter_subscription: subscriberResult.data ?? null,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="taskpilot-data-export.json"',
    },
  });
}
