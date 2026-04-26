import { emailBase } from './_base';

interface GdprDeletionProps {
  email: string;
}

export function renderGdprDeletionEmail({ email }: GdprDeletionProps): {
  html: string;
  subject: string;
} {
  const html = emailBase(
    `<h1>Your account has been deleted</h1>
    <p>This confirms that your TaskPilot account (<span class="highlight">${email}</span>) and all associated personal data have been deleted.</p>
    <hr class="divider"/>
    <p><span class="highlight">What was deleted:</span></p>
    <p>✓ Your account and login credentials<br/>✓ Your name and profile information<br/>✓ Your newsletter subscription</p>
    <hr class="divider"/>
    <p><span class="highlight">What was retained:</span></p>
    <p>Purchase transaction amounts and dates are retained for 7 years as required by Canadian tax law. Your personal information (name, email) has been removed from these records — they are now fully anonymized.</p>
    <hr class="divider"/>
    <p>If you have questions about your data or believe something was missed, contact us at <a href="mailto:privacy@taskpilot.dev" style="color:#38bdf8">privacy@taskpilot.dev</a>.</p>`
  );

  return {
    html,
    subject: 'Your TaskPilot account has been deleted',
  };
}
