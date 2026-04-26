import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getResend, FROM, logEmail } from '@/lib/resend';
import { renderNewsletterWelcomeEmail } from '@/emails/newsletter-welcome';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taskpilot.vercel.app';

  if (!token || !email) {
    return NextResponse.redirect(`${siteUrl}/?error=invalid_link`);
  }

  const db = getAdminClient();
  const { data: subscriber } = await db
    .from('subscribers')
    .select('id, email, name, confirmed, confirmation_token')
    .eq('email', email)
    .eq('confirmation_token', token)
    .maybeSingle();

  if (!subscriber) {
    return NextResponse.redirect(`${siteUrl}/?error=invalid_token`);
  }

  if (subscriber.confirmed) {
    return NextResponse.redirect(`${siteUrl}/?subscribed=true`);
  }

  await db
    .from('subscribers')
    .update({ confirmed: true, confirmed_at: new Date().toISOString(), confirmation_token: null })
    .eq('id', subscriber.id);

  try {
    const resend = getResend();
    const { html, subject } = renderNewsletterWelcomeEmail({ email, name: subscriber.name });
    await resend.emails.send({ from: FROM, to: [email], subject, html });
    await logEmail(db, email, subject, 'newsletter_welcome');
  } catch (err) {
    console.error('[confirm-subscription] Welcome email error:', err);
  }

  return NextResponse.redirect(`${siteUrl}/?subscribed=true`);
}
