import { emailBase } from './_base';

interface ContactAdminProps {
  name: string;
  email: string;
  company?: string;
  message: string;
  budget?: string;
}

export function renderContactAdminEmail({
  name, email, company, message, budget,
}: ContactAdminProps): { html: string; subject: string } {
  const budgetLabels: Record<string, string> = {
    under_500: 'Under $500',
    '500_2000': '$500–$2,000',
    '2000_5000': '$2,000–$5,000',
    '5000_plus': '$5,000+',
    not_sure: 'Not sure',
  };

  const html = emailBase(
    `<h1>New custom automation request</h1>
    <p><span class="highlight">Name:</span> ${name}</p>
    <p><span class="highlight">Email:</span> <a href="mailto:${email}" style="color:#38bdf8">${email}</a></p>
    ${company ? `<p><span class="highlight">Company:</span> ${company}</p>` : ''}
    ${budget ? `<p><span class="highlight">Budget:</span> ${budgetLabels[budget] ?? budget}</p>` : ''}
    <hr class="divider"/>
    <p><span class="highlight">Message:</span></p>
    <p style="background:#1F2937;border-left:3px solid #0EA5E9;padding:12px 16px;border-radius:0 8px 8px 0;color:#F9FAFB">${message.replace(/\n/g, '<br>')}</p>`
  );

  return {
    html,
    subject: `New request from ${name}${company ? ` at ${company}` : ''}`,
  };
}

interface ContactUserProps {
  name: string;
  email: string;
}

export function renderContactUserEmail({
  name, email,
}: ContactUserProps): { html: string; subject: string } {
  const html = emailBase(
    `<h1>Got your message</h1>
    <p>Hi ${name},</p>
    <p>Your message came through. I'll review your requirements and get back to you within <span class="highlight">one business day</span>.</p>
    <p>In the meantime, if you haven't already, the <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taskpilot.vercel.app'}/checkout" style="color:#38bdf8">IT Helpdesk Automation Starter Kit ($19)</a> covers the most common automation needs right out of the box.</p>
    <p>Talk soon,<br/><span class="highlight">Mike · TaskPilot</span></p>`
  );

  return {
    html,
    subject: `We received your message, ${name}`,
  };
}
