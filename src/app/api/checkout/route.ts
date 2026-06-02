import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/stripe';
import { CheckoutSchema } from '@/lib/validations';
import { parseRequestBody, checkRateLimit, ONE_HOUR_MS } from '@/lib/api-utils';

export async function POST(request: Request) {
  const rlResult = checkRateLimit(request, 'checkout', 10, ONE_HOUR_MS);
  if (!rlResult.ok) return rlResult.response;

  const raw = await request.text();
  const bodyResult = parseRequestBody(raw, CheckoutSchema, 2048, 'Invalid product slug');
  if (!bodyResult.ok) return bodyResult.response;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!process.env.STRIPE_PRICE_ID) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taskpilot.vercel.app';

  try {
    const session = await createCheckoutSession({
      priceId: process.env.STRIPE_PRICE_ID,
      productSlug: bodyResult.data.productSlug,
      email: user?.email,
      userId: user?.id,
      successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/?cancelled=true`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[checkout] Stripe session error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
