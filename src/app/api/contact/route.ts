import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getResend, FROM, logEmail } from '@/lib/resend';
import { ContactSchema } from '@/lib/validations';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { renderContactAdminEmail, renderContactUserEmail } from '@/emails/contact';

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 8192) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const ip = getClientIp(request);
  const limit = rateLimit(`contact:${ip}`, 3, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid form data' }, { status: 400 });
  }

  const { name, email, company, message, budget } = parsed.data;
  const db = getAdminClient();

  const { error: dbError } = await db.from('contact_requests').insert({
    name, email, company: company ?? null, message, budget: budget ?? null,
  });

  if (dbError) {
    console.error('[contact] DB insert error:', dbError.message);
    return NextResponse.json({ error: 'Failed to save request. Please try again.' }, { status: 500 });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? '';
  const resend = getResend();

  try {
    if (adminEmail) {
      const { html: adminHtml, subject: adminSubject } = renderContactAdminEmail({ name, email, company, message, budget });
      await resend.emails.send({ from: FROM, to: [adminEmail], subject: adminSubject, html: adminHtml });
      await logEmail(db, adminEmail, adminSubject, 'contact_admin');
    }
  } catch (err) {
    console.error('[contact] Admin notification error:', err);
  }

  try {
    const { html: userHtml, subject: userSubject } = renderContactUserEmail({ name, email });
    await resend.emails.send({ from: FROM, to: [email], subject: userSubject, html: userHtml });
    await logEmail(db, email, userSubject, 'contact_user');
  } catch (err) {
    console.error('[contact] User confirmation error:', err);
  }

  return NextResponse.json({ success: true });
}
