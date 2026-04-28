const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taskpilot.vercel.app';

export function emailBase(content: string, unsubToken?: string, unsubEmail?: string): string {
  const unsubLink =
    unsubToken && unsubEmail
      ? `${SITE_URL}/unsubscribe?token=${encodeURIComponent(unsubToken)}&email=${encodeURIComponent(unsubEmail)}`
      : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="color-scheme" content="dark"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#000000;color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;padding:32px 16px}
.wrap{max-width:520px;margin:0 auto}
.logo{font-weight:800;font-size:18px;letter-spacing:-0.02em;color:#F9FAFB;text-decoration:none;display:inline-block;margin-bottom:32px}
.logo span{color:#38bdf8}
.card{background:#0D0D0D;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px}
h1{font-size:22px;font-weight:700;color:#F9FAFB;letter-spacing:-0.02em;margin-bottom:12px}
p{color:#9CA3AF;margin-bottom:16px}
.btn{display:inline-block;background:#0EA5E9;color:#fff!important;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;margin:8px 0 16px}
.btn:hover{background:#0284C7}
.highlight{color:#F9FAFB;font-weight:600}
.divider{border:0;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0}
.footer{font-size:12px;color:#4B5563;margin-top:24px;line-height:1.8}
.footer a{color:#6B7280;text-decoration:underline}
code{background:#1F2937;color:#38bdf8;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px}
</style>
</head>
<body>
<div class="wrap">
  <a href="${SITE_URL}" class="logo">Task<span>Pilot</span></a>
  <div class="card">
    ${content}
  </div>
  <div class="footer">
    <p>TaskPilot · Toronto, Ontario, Canada</p>
    <p><a href="${SITE_URL}/privacy">Privacy Policy</a> · <a href="${SITE_URL}/terms">Terms of Service</a>${unsubLink ? ` · <a href="${unsubLink}">Unsubscribe</a>` : ''}</p>
    <p>You received this because you have an account or subscription with TaskPilot.</p>
  </div>
</div>
</body>
</html>`;
}
