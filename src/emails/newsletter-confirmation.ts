import { emailBase } from './_base';

interface SubscribeConfirmationProps {
  email: string;
  name?: string;
  confirmUrl: string;
}

export function renderSubscribeConfirmationEmail({
  email,
  name,
  confirmUrl,
}: SubscribeConfirmationProps): { html: string; subject: string } {
  const greeting = name ? `Hi ${name},` : 'Hi there,';

  const html = emailBase(
    `<h1>Confirm your subscription</h1>
    <p>${greeting}</p>
    <p>You signed up for <span class="highlight">1-Minute IT Automation</span> — weekly tips for IT pros who want to work smarter.</p>
    <a href="${confirmUrl}" class="btn">Yes, subscribe me →</a>
    <p>If the button doesn't work, copy this link into your browser:</p>
    <p style="word-break:break-all;font-size:12px;color:#6B7280">${confirmUrl}</p>
    <hr class="divider"/>
    <p style="font-size:13px;color:#6B7280">If you didn't sign up, ignore this email — nothing will happen.</p>`
  );

  return {
    html,
    subject: 'Confirm your TaskPilot subscription',
  };
}
