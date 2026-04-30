import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import { getResend, FROM, logEmail } from '@/lib/resend';
import { renderPurchaseConfirmationEmail } from '@/emails/purchase-confirmation';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id') ?? '';

  if (!sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
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
  const customerEmail = session.customer_email ?? session.customer_details?.email ?? '';

  // 2 — Get storage path from DB
  let db;
  try { db = getAdminClient(); } catch (err) {
    console.error('[download/session] getAdminClient failed:', err);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const { data: product, error: productErr } = await db
    .from('products')
    .select('id, storage_path')
    .eq('slug', productSlug)
    .maybeSingle();

  if (productErr || !product?.storage_path) {
    console.error('[download/session] product lookup:', productErr?.message, '| slug:', productSlug);
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // 3 — Backfill purchase record so it shows in dashboard.
  //     Check existence first: if this is a new record the webhook didn't create,
  //     send the confirmation email now as a fallback (webhook may not have fired).
  if (customerEmail && product.id) {
    try {
      const { data: existing } = await db
        .from('purchases')
        .select('id')
        .eq('stripe_session_id', sessionId)
        .maybeSingle();

      await db.from('purchases').upsert({
        email: customerEmail,
        product_id: product.id,
        product_slug: productSlug,
        stripe_session_id: sessionId,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
        amount_cents: session.amount_total ?? 0,
        currency: session.currency ?? 'usd',
        status: 'completed',
      }, { onConflict: 'stripe_session_id' });

      // Send confirmation email only when webhook didn't already do it
      if (!existing) {
        try {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taskpilot.vercel.app';
          const resend = getResend();
          const { html, subject } = renderPurchaseConfirmationEmail({
            email: customerEmail,
            dashboardUrl: `${siteUrl}/dashboard`,
            downloadUrl: `${siteUrl}/api/download/session?session_id=${sessionId}`,
          });
          await resend.emails.send({ from: FROM, to: [customerEmail], subject, html });
          await logEmail(db, customerEmail, subject, 'purchase_confirmation');
          console.log('[download/session] Confirmation email sent (webhook fallback) to', customerEmail);
        } catch (emailErr) {
          // Non-fatal: don't block the download if email fails
          console.error('[download/session] Confirmation email error:', emailErr);
        }
      }
    } catch (err) {
      // Non-fatal: log but don't block the download
      console.error('[download/session] purchase backfill failed:', err);
    }
  }

  // 4 — Generate signed URL (try multiple path variants)
  const pathsToTry = [
    product.storage_path,
    product.storage_path.split('/').pop() ?? '',
    `products/${product.storage_path.split('/').pop() ?? ''}`,
  ].filter((p, i, a) => p && a.indexOf(p) === i);

  let signedUrl = '';
  for (const p of pathsToTry) {
    const { data, error } = await db.storage.from('products').createSignedUrl(p, 3600);
    if (!error && data?.signedUrl) {
      signedUrl = data.signedUrl;
      break;
    }
    console.log('[download/session] path not found:', p, '|', error?.message);
  }

  if (!signedUrl) {
    return NextResponse.json(
      { error: 'File not found in storage. Please contact support or sign in to re-download from your dashboard.' },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signedUrl);
}
