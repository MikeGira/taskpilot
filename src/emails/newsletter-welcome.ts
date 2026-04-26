import { emailBase } from './_base';
import { makeUnsubscribeToken } from '@/lib/tokens';

interface NewsletterWelcomeProps {
  email: string;
  name?: string | null;
}

export function renderNewsletterWelcomeEmail({
  email,
  name,
}: NewsletterWelcomeProps): { html: string; subject: string } {
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  const token = makeUnsubscribeToken(email);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taskpilot.vercel.app';

  const html = emailBase(
    `<h1>Welcome — here's your first tip</h1>
    <p>${greeting}</p>
    <p>You're subscribed to <span class="highlight">1-Minute IT Automation</span>. Every week: one practical automation you can use immediately.</p>
    <hr class="divider"/>
    <p><span class="highlight">Tip #1: Find failed login attempts in seconds</span></p>
    <p>Run this on any Windows Server to pull the last 50 failed logins:</p>
    <p><code>Get-EventLog -LogName Security -InstanceId 4625 -Newest 50 | Select TimeGenerated, Message | Format-List</code></p>
    <p>Save it as <code>check-logins.ps1</code> and schedule it daily — you'll spot brute force attempts before they succeed.</p>
    <hr class="divider"/>
    <p>Ready to automate more? The full kit (4 scripts + config + scheduler) is $19:</p>
    <a href="${siteUrl}/checkout" class="btn">Get the full kit →</a>`,
    token,
    email
  );

  return {
    html,
    subject: 'Welcome! Here\'s your first IT automation tip',
  };
}
