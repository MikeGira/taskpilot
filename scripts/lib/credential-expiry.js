'use strict';

/**
 * Pure decision logic for the credential expiry guard.
 *
 * Fine-grained personal access tokens expire after at most 366 days, and an expired token is
 * automatically revoked and CANNOT be restored — the only remedy is creating a new one and
 * re-adding every secret that used it. So the failure mode is not "a warning was missed", it is
 * "several workflows start failing on an ordinary Tuesday for a reason nobody connects to a token
 * issued a year earlier".
 *
 * The obvious automation does not work: GitHub publishes a `GitHub-Authentication-Token-Expiration`
 * response header, but for FINE-GRAINED tokens it returns the current server time rather than the
 * real expiry (google/go-github#3708), so expiry cannot be read back from the API. There is also no
 * REST endpoint listing a personal account's tokens. A declared date in the repo is therefore the
 * only reliable source of advance warning, which is why this reads a manifest rather than probing.
 *
 * Liveness is a separate question and IS answerable at runtime — see check-credential-expiry.js.
 * The two together cover both halves: the manifest warns before the cliff, the probe catches a
 * token revoked early or a date recorded wrongly.
 *
 * Side-effect free so the thresholds are unit-tested; the runner owns probing, issues and email.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

// Deliberately generous. A fine-grained PAT cannot be "renewed" in place, so the work is
// create-token, update-every-secret, verify — worth starting well before it bites.
const URGENT_DAYS = 14;
const WARN_DAYS = 45;

/**
 * @param {string} expires ISO date (YYYY-MM-DD)
 * @param {string} today ISO date (YYYY-MM-DD)
 * @returns {number|null} whole days until expiry (negative once past), or null if unparseable
 */
function daysUntil(expires, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(expires)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(today))) {
    return null;
  }
  return Math.round((Date.parse(`${expires}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}

/**
 * Classify every credential in the manifest against today's date.
 *
 * A missing or malformed `expires` is treated as `expired`, not skipped: an unreadable date is a
 * manifest that has stopped protecting anything, and silently passing would defeat the guard.
 *
 * @param {any} manifest parsed .github/credentials.json
 * @param {string} today ISO date
 * @returns {{ ok: boolean, expired: any[], urgent: any[], warn: any[], healthy: any[] }}
 */
function evaluateCredentials(manifest, today) {
  const credentials = (manifest && Array.isArray(manifest.credentials)) ? manifest.credentials : [];
  const expired = [];
  const urgent = [];
  const warn = [];
  const healthy = [];

  for (const credential of credentials) {
    const days = daysUntil(credential && credential.expires, today);
    const entry = { ...credential, daysRemaining: days };

    if (days === null || days <= 0) expired.push(entry);
    else if (days <= URGENT_DAYS) urgent.push(entry);
    else if (days <= WARN_DAYS) warn.push(entry);
    else healthy.push(entry);
  }

  const byUrgency = (a, b) => (a.daysRemaining ?? -Infinity) - (b.daysRemaining ?? -Infinity);
  return {
    ok: expired.length === 0 && urgent.length === 0,
    expired: expired.sort(byUrgency),
    urgent: urgent.sort(byUrgency),
    warn: warn.sort(byUrgency),
    healthy: healthy.sort(byUrgency),
  };
}

/**
 * Render the report body. Every credential carries its own renewal steps in the manifest, so the
 * alert is actionable a year from now without anyone having to reconstruct what the token was for.
 *
 * `problems` distinguishes "the secret is missing" from "the token was rejected". They need
 * different fixes — one is a secret that was never added, the other is a token that has died — and
 * a report read a year from now must not send someone hunting the wrong one.
 *
 * @param {ReturnType<typeof evaluateCredentials>} result
 * @param {string} today
 * @param {{ name: string, reason: 'missing'|'rejected' }[]} [problems] failed liveness probes
 * @returns {string} markdown
 */
function renderReport(result, today, problems = []) {
  const lines = [`## Credential expiry check — ${today}`, ''];

  const missing = problems.filter((p) => p.reason === 'missing');
  const rejected = problems.filter((p) => p.reason === 'rejected');

  if (rejected.length > 0) {
    lines.push('### Not authenticating now', '');
    for (const p of rejected) {
      lines.push(`- \`${p.name}\` was rejected by the GitHub API. It is revoked, expired, or the stored value is wrong. Workflows depending on it are failing right now.`);
    }
    lines.push('');
  }

  if (missing.length > 0) {
    lines.push('### Secret not configured', '');
    for (const p of missing) {
      lines.push(`- \`${p.name}\` is declared in the manifest but no such secret reached this workflow. The token may exist without ever having been added as a repository secret — those are two separate steps.`);
    }
    lines.push('');
  }

  const section = (title, items) => {
    if (items.length === 0) return;
    lines.push(`### ${title}`, '');
    for (const c of items) {
      const when = c.daysRemaining === null
        ? `no readable expiry date in the manifest`
        : c.daysRemaining <= 0
          ? `expired ${Math.abs(c.daysRemaining)} day(s) ago`
          : `${c.daysRemaining} day(s) left`;
      lines.push(`- **\`${c.name}\`** — ${when}. Used by: ${c.usedBy || 'unspecified'}.`);
      if (c.renewal) lines.push(`  - Renewal: ${c.renewal}`);
    }
    lines.push('');
  };

  section('Expired or unreadable', result.expired);
  section('Renew now', result.urgent);
  section('Approaching expiry', result.warn);

  if (result.healthy.length > 0) {
    lines.push(`Healthy: ${result.healthy.map((c) => `\`${c.name}\` (${c.daysRemaining}d)`).join(', ')}`, '');
  }

  lines.push(
    'A fine-grained token cannot be extended. Renewing means creating a new one and updating every secret listed above, then correcting `expires` in `.github/credentials.json`.',
    '',
    'To stop doing this annually, migrate the consumer to a GitHub App: installation tokens are minted per run and expire in an hour, and the App private key does not expire at all.',
  );

  return lines.join('\n');
}

module.exports = { evaluateCredentials, renderReport, daysUntil, URGENT_DAYS, WARN_DAYS };
