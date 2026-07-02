import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import { getResend, FROM, logEmail } from '@/lib/resend';
import { renderPurchaseConfirmationEmail } from '@/emails/purchase-confirmation';
import { dbWithRetry } from '@/lib/utils';

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

  // Ack verified events with 200 so Stripe does not retry — EXCEPT when our own
  // infrastructure failed (DB down/unreachable): then return 500 so Stripe keeps
  // retrying for up to 3 days instead of the purchase event being lost forever.
  // Unhandled types are logged for observability rather than silently dropped.
  switch (event.type) {
    case 'checkout.session.completed':
      try {
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
      } catch (err) {
        console.error('[webhook] handler failed, returning 500 so Stripe retries:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'Handler failure, please retry' }, { status: 500 });
      }
      break;
    default:
      console.log('[webhook] Unhandled event type:', event.type);
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

  // Look up product. A DB error (including network failure after retries) throws so
  // the caller returns 500 and Stripe retries; only a genuinely absent row is a no-op.
  const { data: product, error: productErr } = await dbWithRetry(() =>
    db.from('products').select('id').eq('slug', productSlug).maybeSingle()
  );
  if (productErr) {
    throw new Error(`product lookup failed: ${productErr.message}`);
  }
  if (!product) {
    console.error('[webhook] Product not found for slug:', productSlug);
    return;
  }

  // Upsert purchase — idempotent on stripe_session_id, so Stripe retries are safe
  const { error: purchaseError } = await dbWithRetry(() => db.from('purchases').upsert(
    {
      user_id: userId || null,
      email: customerEmail,
      product_id: product.id,
      product_slug: productSlug,
      stripe_session_id: session.id,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
      amount_cents: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
      status: 'completed',
    },
    { onConflict: 'stripe_session_id' }
  ));

  if (purchaseError) {
    throw new Error(`purchase upsert failed: ${purchaseError.message}`);
  }

  // Send confirmation email with direct download link
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taskpilot.vercel.app';
    const resend = getResend();
    const { html, subject } = renderPurchaseConfirmationEmail({
      email: customerEmail,
      dashboardUrl: `${siteUrl}/dashboard`,
      downloadUrl: `${siteUrl}/api/download/session?session_id=${session.id}`,
    });
    await resend.emails.send({ from: FROM, to: [customerEmail], subject, html });
    await logEmail(db, customerEmail, subject, 'purchase_confirmation');
    console.log('[webhook] Confirmation email sent to', customerEmail);
  } catch (err) {
    console.error('[webhook] Confirmation email error:', err);
  }
}
