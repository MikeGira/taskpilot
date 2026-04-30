import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (!rateLimit(`export:${user.id}`, 5, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const db = getAdminClient();

  const [profileResult, purchasesResult, subscriberResult] = await Promise.all([
    db.from('profiles').select('email, full_name, gdpr_consent_at, created_at').eq('id', user.id).maybeSingle(),
    db.from('purchases').select('product_slug, amount_cents, currency, status, created_at').or(`user_id.eq.${user.id},email.eq.${user.email}`),
    db.from('subscribers').select('email, confirmed, confirmed_at, source, created_at').eq('email', user.email!).maybeSingle(),
  ]);

  const profile = profileResult.data ?? { email: user.email, full_name: null, gdpr_consent_at: null, created_at: null };
  const purchases = purchasesResult.data ?? [];
  const sub = subscriberResult.data;
  const exportedAt = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  function row(label: string, value: string | null | undefined) {
    return `<tr><td class="label">${esc(label)}</td><td>${value != null ? esc(value) : '<span class="none">Not set</span>'}</td></tr>`;
  }

  const purchasesHtml = purchases.length === 0
    ? '<p class="none">No purchases on record.</p>'
    : `<table>
        <thead><tr><th>Product</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${purchases.map(p => `<tr>
            <td>${esc(p.product_slug ?? 'N/A')}</td>
            <td>$${((p.amount_cents ?? 0) / 100).toFixed(2)} ${esc((p.currency ?? 'USD').toUpperCase())}</td>
            <td>${esc(p.status ?? 'N/A')}</td>
            <td>${p.created_at ? esc(new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })) : 'N/A'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskPilot Data Export</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 720px; margin: 0 auto; padding: 48px 24px; color: #111; line-height: 1.6; }
    .header { border-bottom: 2px solid #111; padding-bottom: 20px; margin-bottom: 32px; }
    .header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header .meta { color: #666; font-size: 13px; margin-top: 6px; }
    .header .gdpr { display: inline-block; margin-top: 8px; font-size: 12px; background: #f0f0f0; border-radius: 4px; padding: 3px 8px; color: #444; }
    h2 { font-size: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #444; margin-top: 36px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { background: #f5f5f5; text-align: left; padding: 9px 12px; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: #555; }
    td { padding: 9px 12px; border-top: 1px solid #eee; vertical-align: top; }
    td.label { color: #666; width: 200px; font-size: 13px; }
    .none { color: #aaa; font-style: italic; }
    .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #888; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>TaskPilot Data Export</h1>
    <p class="meta">Exported on ${exportedAt}</p>
    <span class="gdpr">GDPR Article 20 — Right to Data Portability</span>
  </div>

  <h2>Profile</h2>
  <table>
    ${row('Email', profile.email)}
    ${row('Full name', profile.full_name)}
    ${row('Member since', profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null)}
    ${row('GDPR consent', profile.gdpr_consent_at ? new Date(profile.gdpr_consent_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null)}
  </table>

  <h2>Purchases</h2>
  ${purchasesHtml}

  <h2>Newsletter Subscription</h2>
  ${sub ? `<table>
    ${row('Email', sub.email)}
    ${row('Status', sub.confirmed ? 'Confirmed' : 'Pending confirmation')}
    ${row('Confirmed on', sub.confirmed_at ? new Date(sub.confirmed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null)}
    ${row('Subscribed via', sub.source)}
    ${row('Subscribed on', sub.created_at ? new Date(sub.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null)}
  </table>` : '<p class="none">Not subscribed to the newsletter.</p>'}

  <div class="footer">
    This report was generated by TaskPilot in response to a GDPR Article 20 data portability request.
    To delete your data, visit Dashboard &rarr; Account &rarr; Delete account.
    Questions: <a href="mailto:privacy@taskpilot.dev">privacy@taskpilot.dev</a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'attachment; filename="taskpilot-data-export.html"',
    },
  });
}
