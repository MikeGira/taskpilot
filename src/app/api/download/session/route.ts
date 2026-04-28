import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase/admin';

// Rate limit: simple in-memory map keyed by session_id (one download attempt per session per hour)
const recentSessions = new Map<string, number>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId || !sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
  }

  // Prevent replay — same session_id can only trigger a download once per 15 min
  const lastUsed = recentSessions.get(sessionId);
  if (lastUsed && Date.now() - lastUsed < 15 * 60 * 1000) {
    return NextResponse.json({ error: 'Link already used. Log in to re-download.' }, { status: 429 });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });
  }

  // Verify with Stripe that this session was actually paid
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 403 });
  }

  // Look up the purchase in Supabase to get the product storage path
  const db = getAdminClient();
  const { data: purchase } = await db
    .from('purchases')
    .select('id, products(storage_path)')
    .eq('stripe_session_id', sessionId)
    .eq('status', 'completed')
    .maybeSingle();

  if (!purchase) {
    return NextResponse.json({ error: 'Purchase record not found. Please contact support.' }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storagePath = (purchase as any).products?.storage_path as string | undefined;
  if (!storagePath) {
    return NextResponse.json({ error: 'Product not configured' }, { status: 500 });
  }

  // Generate a 1-hour signed URL
  const { data: signed, error: signErr } = await db.storage
    .from('products')
    .createSignedUrl(storagePath, 3600);

  if (signErr || !signed?.signedUrl) {
    console.error('[download/session] signed URL error:', signErr?.message);
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
  }

  // Mark this session as used
  recentSessions.set(sessionId, Date.now());

  // Redirect directly to the signed URL — browser downloads the file
  return NextResponse.redirect(signed.signedUrl);
}
