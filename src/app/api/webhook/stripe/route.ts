import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import { getResend, FROM, logEmail } from '@/lib/resend';
import { renderPurchaseConfirmationEmail } from '@/emails/purchase-confirmation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', (err as Error).message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const db = getAdminClient();
  const productSlug = session.metadata?.product_slug ?? 'it-helpdesk-starter-kit';
  const userId = session.metadata?.user_id || null;
  const customerEmail = session.customer_email ?? session.customer_details?.email ?? '';

  if (!customerEmail) {
    console.error('[webhook] No customer email on session:', session.id);
    return;
  }

  // Look up product
  const { data: product } = await db
    .from('products')
    .select('id')
    .eq('slug', productSlug)
    .maybeSingle();

  if (!product) {
    console.error('[webhook] Product not found for slug:', productSlug);
    return;
  }

  // Upsert purchase — idempotent on stripe_session_id
  const { error: purchaseError } = await db.from('purchases').upsert(
    {
      user_id: userId || null,
      email: customerEmail,
      product_id: product.id,
      product_slug: productSlug,
      stripe_session_id: session.id,
      stripe_customer_id: session.customer as string | null,
      amount_cents: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
      status: 'completed',
    },
    { onConflict: 'stripe_session_id' }
  );

  if (purchaseError) {
    console.error('[webhook] Purchase upsert error:', purchaseError.message);
    return;
  }

  // Send confirmation email
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taskpilot.vercel.app';
    const resend = getResend();
    const { html, subject } = renderPurchaseConfirmationEmail({
      email: customerEmail,
      dashboardUrl: `${siteUrl}/dashboard`,
    });
    await resend.emails.send({ from: FROM, to: [customerEmail], subject, html });
    await logEmail(db, customerEmail, subject, 'purchase_confirmation');
  } catch (err) {
    console.error('[webhook] Confirmation email error:', err);
  }
}
