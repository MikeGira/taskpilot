import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getResend, FROM, logEmail } from '@/lib/resend';
import { generateConfirmationToken } from '@/lib/tokens';
import { SubscribeSchema } from '@/lib/validations';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { renderSubscribeConfirmationEmail } from '@/emails/newsletter-confirmation';

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 8192) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const ip = getClientIp(request);
  const limit = rateLimit(`subscribe:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid email' }, { status: 400 });
  }

  const { email, name } = parsed.data;
  const db = getAdminClient();

  // Silently succeed for already-confirmed subscribers (prevent email enumeration)
  const { data: existing } = await db
    .from('subscribers')
    .select('confirmed')
    .eq('email', email)
    .maybeSingle();

  if (existing?.confirmed) {
    return NextResponse.json({ success: true });
  }

  const token = generateConfirmationToken();
  const { error } = await db.from('subscribers').upsert(
    { email, name: name ?? null, confirmed: false, confirmation_token: token, source: 'website' },
    { onConflict: 'email' }
  );

  if (error) {
    console.error('[subscribe] DB upsert error:', error.message);
    return NextResponse.json({ error: 'Failed to save subscription. Please try again.' }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taskpilot.vercel.app';
  const confirmUrl = `${siteUrl}/api/confirm-subscription?token=${token}&email=${encodeURIComponent(email)}`;

  try {
    const resend = getResend();
    const { html, subject } = renderSubscribeConfirmationEmail({ email, name, confirmUrl });
    await resend.emails.send({ from: FROM, to: [email], subject, html });
    await logEmail(db, email, subject, 'newsletter_confirmation');
  } catch (err) {
    console.error('[subscribe] Email send error:', err);
  }

  return NextResponse.json({ success: true });
}
