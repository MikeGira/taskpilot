import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (_resend) return _resend;
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'hello@taskpilot.dev';
export const FROM_NAME = 'TaskPilot';
export const FROM = `${FROM_NAME} <${FROM_EMAIL}>`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function logEmail(
  db: SupabaseClient<any>,
  recipient: string,
  subject: string,
  emailType: string,
  status: 'sent' | 'failed' = 'sent'
) {
  await db.from('email_logs').insert({ recipient, subject, email_type: emailType, status });
}
