import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  // No apiVersion pin: stripe-node uses the API version its types are built
  // against; pinning a literal here breaks the build on every SDK bump.
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

export async function createCheckoutSession(params: {
  priceId: string;
  productSlug: string;
  email?: string;
  userId?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  return getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: params.priceId, quantity: 1 }],
    customer_email: params.email,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      product_slug: params.productSlug,
      user_id: params.userId ?? '',
    },
    payment_intent_data: {
      metadata: { product_slug: params.productSlug },
    },
  });
}
