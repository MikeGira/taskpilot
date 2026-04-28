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
      { error: 'Link already used. Sign in to re-download from your dashboard.' },
      { status: 429 }
    );
  }

  // 1 — Verify payment with Stripe
  let stripe;
  try { stripe = getStripe(); } catch (err) {
    console.error('[download/session] getStripe failed:', err);
    return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });
  }

  let session;
  try { session = await stripe.checkout.sessions.retrieve(sessionId); } catch (err) {
    console.error('[download/session] retrieve failed:', err);
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 403 });
  }

  const productSlug = session.metadata?.product_slug ?? 'it-helpdesk-starter-kit';

  // 2 — Get storage path from DB
  let db;
  try { db = getAdminClient(); } catch (err) {
    console.error('[download/session] getAdminClient failed:', err);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const { data: product, error: productErr } = await db
    .from('products')
    .select('storage_path')
    .eq('slug', productSlug)
    .maybeSingle();

  if (productErr || !product?.storage_path) {
    console.error('[download/session] product lookup:', productErr?.message, '| slug:', productSlug);
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // 3 — Generate signed URL, trying multiple path variants
  //     Common issue: DB has "products/taskpilot-kit.zip" but file was uploaded
  //     to the bucket root as "taskpilot-kit.zip" — we try both.
  const pathsToTry = [
    product.storage_path,                                      // exact DB value
    product.storage_path.split('/').pop() ?? '',               // filename only
    `products/${product.storage_path.split('/').pop() ?? ''}`, // products/ prefix
  ].filter((p, i, arr) => p && arr.indexOf(p) === i);         // dedupe

  let signedUrl = '';
  for (const p of pathsToTry) {
    const { data, error } = await db.storage.from('products').createSignedUrl(p, 3600);
    if (!error && data?.signedUrl) {
      signedUrl = data.signedUrl;
      console.log('[download/session] signed URL OK for path:', p);
      break;
    }
    console.log('[download/session] path not found:', p, '|', error?.message);
  }

  if (!signedUrl) {
    return NextResponse.json(
      { error: 'File not found in storage. Contact support — download link will be emailed to you.' },
      { status: 500 }
    );
  }

  used.add(sessionId);
  return NextResponse.redirect(signedUrl);
}
