#!/usr/bin/env node
'use strict';

/**
 * Credential expiry guard.
 *
 * Two independent signals, because neither alone is sufficient:
 *
 *   DECLARED DATES give advance warning, which is the only thing that actually helps — a
 *   fine-grained PAT cannot be extended, so renewal means creating a new token and updating every
 *   secret that used it, and that is not work to discover on the morning it breaks. GitHub exposes
 *   no API for this (the expiry header reports the current time for fine-grained tokens, and no
 *   endpoint lists a personal account's tokens), so the dates live in .github/credentials.json.
 *
 *   A LIVENESS PROBE catches what dates cannot: a token revoked early, a secret pasted wrong, or a
 *   date recorded incorrectly. It answers "does this authenticate right now", which is always true
 *   or false with no guessing.
 *
 * Files one deduplicated issue and emails, then exits non-zero if anything is expired, urgent, or
 * failing to authenticate — a silent pass here is the failure this guard exists to prevent.
 */

const fs = require('node:fs');
const path = require('node:path');
const { evaluateCredentials, renderReport } = require('./lib/credential-expiry');

const REPO = process.env.GITHUB_REPOSITORY || 'MikeGira/taskpilot';
const GH_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'hello@blog.h0m3labs.store';
const ALERT_EMAIL = process.env.ALERT_EMAIL || 'byosekumbuga@gmail.com';
const ISSUE_TITLE = 'Credential expiry: action required';
const MANIFEST = path.join(__dirname, '..', '.github', 'credentials.json');

/**
 * Does this token authenticate right now? Distinguishes a dead token (401) from an unrelated
 * outage — only the former is reported, so a GitHub incident does not masquerade as an expiry.
 * @param {string} token
 * @returns {Promise<boolean|null>} true alive, false rejected, null indeterminate
 */
async function isTokenAlive(token) {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    });
    if (res.status === 401 || res.status === 403) return false;
    if (!res.ok) return null;
    return true;
  } catch {
    return null;
  }
}

async function upsertIssue(body) {
  if (!GH_TOKEN) { console.log('No GH_TOKEN — skipping issue.'); return null; }
  const headers = {
    Authorization: `Bearer ${GH_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  const search = await fetch(
    `https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${REPO} is:issue is:open in:title "${ISSUE_TITLE}"`)}`,
    { headers },
  );
  const existing = search.ok ? (await search.json()).items?.[0] : null;

  if (existing) {
    await fetch(`https://api.github.com/repos/${REPO}/issues/${existing.number}/comments`, {
      method: 'POST', headers, body: JSON.stringify({ body }),
    });
    return existing.html_url;
  }

  const created = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: 'POST', headers, body: JSON.stringify({ title: ISSUE_TITLE, body }),
  });
  if (!created.ok) { console.warn(`Issue creation failed: ${created.status}`); return null; }
  return (await created.json()).html_url;
}

async function sendEmail(body, issueUrl, today) {
  if (!RESEND_API_KEY) { console.log('RESEND_API_KEY not set — skipping email.'); return; }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `TaskPilot Monitor <${RESEND_FROM}>`,
      to: [ALERT_EMAIL],
      subject: `[TaskPilot] Credential expiry — action required (${today})`,
      html: `<h2>Credential expiry check</h2>
<pre style="background:#f5f5f5;padding:16px;border-radius:6px;font-size:13px;white-space:pre-wrap">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
${issueUrl ? `<p><a href="${issueUrl}" style="color:#3ECF8E;font-weight:bold">Tracking issue &rarr;</a></p>` : ''}`,
    }),
  });
  if (!res.ok) console.warn(`Email failed: ${res.status}`);
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const result = evaluateCredentials(manifest, today);

  const problems = [];
  for (const credential of manifest.credentials || []) {
    const secretName = credential.probeSecret;
    if (!secretName) continue;
    const value = process.env[secretName];
    if (!value) {
      // The manifest says this repo holds the secret, but the workflow did not receive it —
      // a different fault from a token that authenticated and was refused.
      problems.push({ name: credential.name, reason: 'missing' });
      continue;
    }
    const alive = await isTokenAlive(value);
    if (alive === false) problems.push({ name: credential.name, reason: 'rejected' });
    else if (alive === null) console.log(`${credential.name}: liveness indeterminate (API unreachable) — not reported.`);
  }

  const report = renderReport(result, today, problems);
  console.log(report);

  if (result.ok && problems.length === 0) {
    console.log('\nAll credentials healthy.');
    return;
  }

  const issueUrl = await upsertIssue(report);
  await sendEmail(report, issueUrl, today);
  process.exit(1);
}

main().catch((err) => {
  console.error(`Credential expiry guard failed to run: ${err && err.message}`);
  process.exit(2);
});
