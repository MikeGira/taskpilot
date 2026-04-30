import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import { getAdminClient } from '@/lib/supabase/admin';
import { getResend, FROM } from '@/lib/resend';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

const FeedbackSchema = z.object({
  os: z.enum(['windows', 'linux', 'macos', 'cross-platform']),
  environment: z.enum(['on-premises', 'hybrid', 'cloud', 'multi-cloud']),
  language: z.string().max(50).optional(),
  rating: z.union([z.literal(1), z.literal(-1)]),
  comment: z.string().max(500).trim().optional(),
});

const OS_LABELS: Record<string, string> = {
  windows: 'Windows', linux: 'Linux', macos: 'macOS', 'cross-platform': 'Cross-Platform',
};
const ENV_LABELS: Record<string, string> = {
  'on-premises': 'On-Premises', hybrid: 'Hybrid', cloud: 'Cloud', 'multi-cloud': 'Multi-Cloud',
};

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`feedback:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const raw = await request.text();
  let body: unknown;
  try { body = JSON.parse(raw); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { os, environment, language, rating, comment } = parsed.data;
  const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 16);

  const db = getAdminClient();
  const { error: dbErr } = await db.from('generation_feedback').insert({
    os,
    environment,
    language: language ?? null,
    rating,
    comment: comment || null,
    ip_hash: ipHash,
  });
  if (dbErr) console.error('[feedback] DB insert:', dbErr);

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    try {
      const resend = getResend();
      await resend.emails.send({
        from: FROM,
        to: adminEmail,
        subject: `[TaskPilot] New feedback — ${rating === 1 ? '👍 Positive' : '👎 Needs improvement'}`,
        html: buildEmail({ os, environment, language, rating, comment }),
      });
    } catch (err) {
      console.error('[feedback] Email failed:', err);
    }
  }

  return NextResponse.json({ success: true });
}

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildEmail({
  os, environment, language, rating, comment,
}: {
  os: string; environment: string; language?: string; rating: number; comment?: string;
}): string {
  const emoji = rating === 1 ? '👍' : '👎';
  const label = rating === 1 ? 'Positive' : 'Needs improvement';
  const color = rating === 1 ? '#10b981' : '#f59e0b';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const now = new Date().toUTCString();

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;background:#000000;color:#F9FAFB;padding:32px;max-width:560px;margin:0 auto">
  <div style="background:#0D0D0D;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px">
    <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:.05em">TaskPilot · Script Generator</p>
    <h2 style="margin:0 0 20px;font-size:18px">New Feedback ${emoji}</h2>
    <div style="background:${color}18;border:1px solid ${color}40;border-radius:8px;padding:12px 16px;margin-bottom:20px">
      <span style="font-size:15px;font-weight:700;color:${color}">${emoji} ${label}</span>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
      <tr><td style="padding:5px 0;color:#9CA3AF;width:120px">OS</td><td style="color:#F9FAFB;font-weight:500">${esc(OS_LABELS[os] ?? os)}</td></tr>
      <tr><td style="padding:5px 0;color:#9CA3AF">Environment</td><td style="color:#F9FAFB;font-weight:500">${esc(ENV_LABELS[environment] ?? environment)}</td></tr>
      ${language ? `<tr><td style="padding:5px 0;color:#9CA3AF">Language</td><td style="color:#F9FAFB;font-weight:500">${esc(language)}</td></tr>` : ''}
      <tr><td style="padding:5px 0;color:#9CA3AF">Time</td><td style="color:#6B7280;font-size:12px">${esc(now)}</td></tr>
    </table>
    ${comment
      ? `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px 16px;margin-bottom:20px">
           <p style="margin:0 0 6px;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:.05em">User comment</p>
           <p style="margin:0;font-size:14px;color:#D1D5DB;line-height:1.5">${esc(comment)}</p>
         </div>`
      : `<p style="font-size:13px;color:#6B7280;margin-bottom:20px;font-style:italic">No comment provided.</p>`}
    <a href="${siteUrl}/dashboard/analytics" style="display:inline-block;background:#ffffff;color:#000;font-size:13px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:8px">View Analytics →</a>
  </div>
</body></html>`;
}
