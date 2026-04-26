import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/stripe';
import { Loader2 } from 'lucide-react';

export const metadata = { title: 'Checkout' };

export default async function CheckoutPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!process.env.STRIPE_PRICE_ID) {
    throw new Error('STRIPE_PRICE_ID is not configured');
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taskpilot.vercel.app';

  const session = await createCheckoutSession({
    priceId: process.env.STRIPE_PRICE_ID,
    productSlug: 'it-helpdesk-starter-kit',
    email: user?.email,
    userId: user?.id,
    successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${baseUrl}/?cancelled=true`,
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL');
  }

  redirect(session.url);
}
