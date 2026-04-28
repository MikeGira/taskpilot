import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// Simple in-memory replay guard (per cold-start, per session)
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

  try {
    // 1. Verify payment with Stripe — this is the authoritative source of truth
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 403 });
    }

    // 2. Get the product slug from session metadata (set when checkout was created)
    const productSlug = session.metadata?.product_slug ?? 'it-helpdesk-starter-kit';

    // 3. Look up the product storage path — no need to check purchases table
    //    (Stripe already confirmed payment above)
    const db = getAdminClient();
    const { data: product, error: productErr } = await db
      .from('products')
      .select('storage_path')
      .eq('slug', productSlug)
      .eq('active', true)
      .maybeSingle();

    if (productErr) {
      console.error('[download/session] product lookup error:', productErr.message);
      return NextResponse.json({ error: 'Product lookup failed' }, { status: 500 });
    }

    if (!product?.storage_path) {
      console.error('[download/session] product not found for slug:', productSlug);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // 4. Generate a 1-hour signed URL from private Supabase Storage bucket
    const { data: signed, error: signErr } = await db.storage
      .from('products')
      .createSignedUrl(product.storage_path, 3600);

    if (signErr || !signed?.signedUrl) {
      console.error('[download/session] signed URL error:', signErr?.message);
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
    }

    // Mark as used only after success
    used.add(sessionId);

    return NextResponse.redirect(signed.signedUrl);
  } catch (err) {
    console.error('[download/session] unhandled error:', err);
    return NextResponse.json(
      { error: 'Download failed. Please sign in and use your dashboard to download.' },
      { status: 500 }
    );
  }
}
