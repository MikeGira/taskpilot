import { emailBase } from './_base';

interface PurchaseConfirmationProps {
  email: string;
  dashboardUrl: string;
  downloadUrl?: string;
}

export function renderPurchaseConfirmationEmail({
  email,
  dashboardUrl,
  downloadUrl,
}: PurchaseConfirmationProps): { html: string; subject: string } {
  const html = emailBase(
    `<h1>Your automation kit is ready</h1>
    <p>Thanks for your purchase! Your <span class="highlight">IT Helpdesk Automation Starter Kit</span> is ready to download.</p>
    ${downloadUrl ? `<a href="${downloadUrl}" class="btn">Download Kit Now &rarr;</a>
    <p style="font-size:13px;color:#6B7280;margin-top:-8px;">This link downloads the file directly — no account needed.</p>` : ''}
    <hr class="divider"/>
    <p><span class="highlight">Want to re-download later?</span></p>
    <p>Create a free account with the same email address and your kit will appear in your dashboard anytime.</p>
    <a href="${dashboardUrl}" class="btn" style="background:#1F2937;border:1px solid rgba(255,255,255,0.12);">Go to Dashboard &rarr;</a>
    <hr class="divider"/>
    <p><span class="highlight">What to do next:</span></p>
    <p>1. Extract the ZIP to <code>C:\\IT-Automation\\</code></p>
    <p>2. Open <code>config.json</code> and fill in your domain details (6 fields)</p>
    <p>3. Run any script with PowerShell 5.1+ — the log directory is created automatically</p>
    <hr class="divider"/>
    <p>Questions? Reply to this email and I'll get back to you within one business day.</p>`,
    undefined,
    email
  );

  return {
    html,
    subject: 'Your IT Helpdesk Automation Starter Kit is ready to download',
  };
}
