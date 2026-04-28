import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/stripe';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { CheckoutSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!rateLimit(`checkout:${ip}`, 10, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const raw = await request.text();
  if (raw.length > 2048) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid product slug' }, { status: 400 });
  }

  if (!process.env.STRIPE_PRICE_ID) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taskpilot.vercel.app';

  try {
    const session = await createCheckoutSession({
      priceId: process.env.STRIPE_PRICE_ID,
      productSlug: parsed.data.productSlug,
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
