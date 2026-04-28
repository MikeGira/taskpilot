import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const used = new Set<string>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id') ?? '';

  if (!sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
  }

  if (used.has(sessionId)) {
    return NextResponse.json(
      { error: 'This link has already been used. Sign in to re-download from your dashboard.' },
      { status: 429 }
    );
  }

  // Step 1: verify payment with Stripe
  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error('[download/session] getStripe failed:', err);
    return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    console.error('[download/session] sessions.retrieve failed:', err);
    return NextResponse.json({ error: 'Session not found or invalid' }, { status: 404 });
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 403 });
  }

  // Step 2: get product slug from session metadata
  const productSlug = session.metadata?.product_slug ?? 'it-helpdesk-starter-kit';

  // Step 3: look up storage path directly from products table
  let db;
  try {
    db = getAdminClient();
  } catch (err) {
    console.error('[download/session] getAdminClient failed:', err);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const { data: product, error: productErr } = await db
    .from('products')
    .select('storage_path')
    .eq('slug', productSlug)
    .maybeSingle();

  if (productErr) {
    console.error('[download/session] product query error:', productErr.message);
    return NextResponse.json({ error: 'Product lookup failed: ' + productErr.message }, { status: 500 });
  }

  if (!product?.storage_path) {
    console.error('[download/session] no storage_path for slug:', productSlug);
    return NextResponse.json({ error: 'Product not found in database' }, { status: 404 });
  }

  // Step 4: generate signed URL
  const { data: signed, error: signErr } = await db.storage
    .from('products')
    .createSignedUrl(product.storage_path, 3600);

  if (signErr || !signed?.signedUrl) {
    console.error('[download/session] createSignedUrl error:', signErr?.message);
    return NextResponse.json({ error: 'Failed to generate download URL: ' + (signErr?.message ?? 'unknown') }, { status: 500 });
  }

  used.add(sessionId);
  return NextResponse.redirect(signed.signedUrl);
}
