import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyUnsubscribeToken } from '@/lib/tokens';

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 2048) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { token, email } = body as { token?: string; email?: string };
  if (!token || !email || typeof token !== 'string' || typeof email !== 'string') {
    return NextResponse.json({ error: 'Missing token or email' }, { status: 400 });
  }

  if (!verifyUnsubscribeToken(token, email)) {
    return NextResponse.json({ error: 'Invalid or expired unsubscribe token' }, { status: 400 });
  }

  const db = getAdminClient();
  await db
    .from('subscribers')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('email', email.toLowerCase().trim())
    .is('unsubscribed_at', null);

  return NextResponse.json({ success: true });
}
