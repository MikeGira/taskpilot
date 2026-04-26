import { emailBase } from './_base';
import { makeUnsubscribeToken } from '@/lib/tokens';

interface PurchaseConfirmationProps {
  email: string;
  dashboardUrl: string;
}

export function renderPurchaseConfirmationEmail({ email, dashboardUrl }: PurchaseConfirmationProps): {
  html: string;
  subject: string;
} {
  const token = makeUnsubscribeToken(email);
  const html = emailBase(
    `<h1>Your automation kit is ready 🚀</h1>
    <p>Thanks for your purchase! Your <span class="highlight">IT Helpdesk Automation Starter Kit</span> is waiting in your dashboard.</p>
    <a href="${dashboardUrl}" class="btn">Download your kit →</a>
    <hr class="divider"/>
    <p><span class="highlight">What to do next:</span></p>
    <p>1. Extract the ZIP to <code>C:\\IT-Automation\\</code></p>
    <p>2. Open <code>config.json</code> and fill in your domain details (6 fields)</p>
    <p>3. Run any script with PowerShell 5.1+ — they'll create the log directory automatically</p>
    <hr class="divider"/>
    <p>Questions? Reply to this email — I read every one.</p>`,
    token,
    email
  );

  return {
    html,
    subject: 'Your IT Helpdesk Automation Starter Kit is ready',
  };
}
