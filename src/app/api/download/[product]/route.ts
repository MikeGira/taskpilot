import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';

export async function GET(
  _request: Request,
  { params }: { params: { product: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const productSlug = params.product;
  const db = getAdminClient();

  // ── 1. Look up purchase record in DB ────────────────────────────────────────
  const conditions: string[] = [];
  if (user.id)    conditions.push(`user_id.eq.${user.id}`);
  if (user.email) conditions.push(`email.eq.${user.email}`);

  const { data: purchase } = await db
    .from('purchases')
    .select('id, products(storage_path)')
    .eq('product_slug', productSlug)
    .eq('status', 'completed')
    .or(conditions.join(','))
    .maybeSingle();

  // ── 2. If no DB record, verify via Stripe and backfill ─────────────────────
  //    This handles: webhook never fired, session backfill failed, email mismatch
  let storagePath: string | null = null;

  if (purchase) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storagePath = ((purchase as any).products as { storage_path: string } | null)?.storage_path ?? null;
  } else {
    console.log('[download] no DB record for', user.email, '— trying Stripe fallback');
    try {
      const stripe = getStripe();

      // Find the customer in Stripe by email
      const customers = await stripe.customers.list({ email: user.email, limit: 5 });
      let paidSessionId: string | null = null;
      let stripeCustomerId: string | null = null;
      let amountCents = 1900;

      for (const customer of customers.data) {
        const sessions = await stripe.checkout.sessions.list({
          customer: customer.id,
          limit: 10,
        });
        const paid = sessions.data.find(
          (s) => s.payment_status === 'paid' &&
                 (s.metadata?.product_slug === productSlug || !s.metadata?.product_slug)
        );
        if (paid) {
          paidSessionId = paid.id;
          stripeCustomerId = customer.id;
          amountCents = paid.amount_total ?? 1900;
          break;
        }
      }

      if (!paidSessionId) {
        return NextResponse.json({ error: 'No completed purchase found for this account' }, { status: 403 });
      }

      // Get the product row to backfill
      const { data: productRow } = await db
        .from('products')
        .select('id, storage_path')
        .eq('slug', productSlug)
        .maybeSingle();

      if (productRow) {
        storagePath = productRow.storage_path;
        // Backfill the purchase record so dashboard works next time
        await db.from('purchases').upsert({
          email: user.email,
          user_id: user.id,
          product_id: productRow.id,
          product_slug: productSlug,
          stripe_session_id: paidSessionId,
          stripe_customer_id: stripeCustomerId,
          amount_cents: amountCents,
          currency: 'usd',
          status: 'completed',
        }, { onConflict: 'stripe_session_id' });
        console.log('[download] Stripe fallback succeeded — purchase backfilled');
      }
    } catch (err) {
      console.error('[download] Stripe fallback error:', err);
      return NextResponse.json({ error: 'Purchase not found' }, { status: 403 });
    }
  }

  if (!storagePath) {
    return NextResponse.json({ error: 'Product not configured' }, { status: 500 });
  }

  // ── 3. Generate signed URL with path fallbacks ─────────────────────────────
  const pathsToTry = [
    storagePath,
    storagePath.split('/').pop() ?? '',
    `products/${storagePath.split('/').pop() ?? ''}`,
  ].filter((p, i, a) => p && a.indexOf(p) === i);

  for (const p of pathsToTry) {
    const { data, error } = await db.storage.from('products').createSignedUrl(p, 3600);
    if (!error && data?.signedUrl) {
      return NextResponse.json({ url: data.signedUrl });
    }
    console.log('[download] path not found:', p, '|', error?.message);
  }

  return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
}
