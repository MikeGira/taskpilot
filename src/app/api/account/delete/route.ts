import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getResend, FROM, logEmail } from '@/lib/resend';
import { renderGdprDeletionEmail } from '@/emails/gdpr-deletion';

export async function DELETE() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const db = getAdminClient();
  const userEmail = user.email!;
  const userId = user.id;

  // Send deletion confirmation email FIRST — before the user record is deleted
  try {
    const resend = getResend();
    const { html, subject } = renderGdprDeletionEmail({ email: userEmail });
    await resend.emails.send({ from: FROM, to: [userEmail], subject, html });
    await logEmail(db, userEmail, subject, 'gdpr_deletion');
  } catch (err) {
    console.error('[account/delete] Deletion email error:', err);
  }

  // Anonymize purchases — retain transaction amounts for 7-year tax compliance
  await db.from('purchases').update({
    user_id: null,
    email: '[deleted]',
    stripe_customer_id: null,
  }).or(`user_id.eq.${userId},email.eq.${userEmail}`);

  // Unsubscribe from newsletter
  await db.from('subscribers').update({
    email: `[deleted:${userId.slice(0, 8)}]`,
    unsubscribed_at: new Date().toISOString(),
  }).eq('email', userEmail);

  // Delete profile
  await db.from('profiles').delete().eq('id', userId);

  // Delete auth user — must be last, this invalidates the session
  const { error: deleteError } = await db.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('[account/delete] deleteUser error:', deleteError.message);
    return NextResponse.json({ error: 'Failed to delete account. Please contact support.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
