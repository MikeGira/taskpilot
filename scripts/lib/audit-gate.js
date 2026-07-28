'use strict';

/**
 * Pure decision logic for the CI dependency-audit gate.
 *
 * `npm audit --audit-level=high` is a single boolean over ALL dependencies, and that is what
 * deadlocked this repo on 2026-07-27: brace-expansion's only patched release (5.0.8) moved the
 * callable default export to a named `expand` export, so it cannot be installed under the
 * minimatch@3 that eslint@8's plugin chain pins — there is no compatible fix. A blanket gate
 * therefore fails on EVERY branch forever, which in turn blocked the Dependabot security PRs
 * that would have fixed the genuinely exploitable findings (next, sharp, postcss). Every other
 * check on those PRs was green and auto-merge was already armed; the gate alone held them.
 *
 * The fix is to make the gate express what actually matters, in two axes:
 *   1. SCOPE — a vulnerability reachable from production dependencies is categorically more
 *      serious than one in the lint toolchain. Production findings can never be waived by a
 *      development-scoped exception.
 *   2. EXPIRY — an exception is a dated decision, not a deletion. Every waiver carries an
 *      `expires` date and the gate FAILS once it passes, so a suppression cannot be forgotten.
 *      This mirrors cargo-deny `[advisories]` ignore-with-expiry and Snyk `.snyk` policy expiry.
 *
 * Kept side-effect-free (no spawning, no fs, no network) so the decision is unit-tested;
 * scripts/audit-gate.js owns running npm and reading files.
 */

const BLOCKING_SEVERITIES = new Set(['high', 'critical']);

/**
 * Resolve the root GHSA advisories a vulnerable package is flagged for.
 *
 * npm's `via` is a mixed array: advisory objects for direct findings, and plain package-name
 * strings when the package is only vulnerable *through* a dependency. Following the strings
 * collapses a 13-package chain (eslint -> ... -> minimatch -> brace-expansion) down to the one
 * advisory that actually needs a decision, so exceptions are written against advisories rather
 * than against every package the chain happens to touch.
 *
 * @param {Record<string, any>} vulnerabilities `vulnerabilities` map from `npm audit --json`
 * @param {string} name package to resolve
 * @param {Set<string>} [seen] cycle guard (npm dependency chains can be cyclic)
 * @returns {string[]} sorted, de-duplicated GHSA ids
 */
function resolveAdvisories(vulnerabilities, name, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);

  const entry = vulnerabilities && vulnerabilities[name];
  if (!entry || !Array.isArray(entry.via)) return [];

  const found = new Set();
  for (const via of entry.via) {
    if (typeof via === 'string') {
      for (const id of resolveAdvisories(vulnerabilities, via, seen)) found.add(id);
      continue;
    }
    const ghsa = extractGhsaId(via && via.url);
    if (ghsa) found.add(ghsa);
  }
  return [...found].sort();
}

/**
 * @param {unknown} url GitHub advisory URL, e.g. https://github.com/advisories/GHSA-xxxx-...
 * @returns {string|null} the GHSA id, or null when the URL is missing or unrecognised
 */
function extractGhsaId(url) {
  const m = String(url == null ? '' : url).match(/GHSA-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}/i);
  return m ? m[0].toUpperCase() : null;
}

/**
 * Flatten an audit report into one finding per vulnerable package at blocking severity.
 *
 * @param {any} auditJson parsed `npm audit --json` output
 * @returns {{ package: string, severity: string, advisories: string[], isDirect: boolean }[]}
 */
function collectFindings(auditJson) {
  const vulnerabilities = (auditJson && auditJson.vulnerabilities) || {};
  const findings = [];

  for (const [name, entry] of Object.entries(vulnerabilities)) {
    const severity = String((entry && entry.severity) || '').toLowerCase();
    if (!BLOCKING_SEVERITIES.has(severity)) continue;
    findings.push({
      package: name,
      severity,
      advisories: resolveAdvisories(vulnerabilities, name),
      isDirect: Boolean(entry && entry.isDirect),
    });
  }

  return findings.sort((a, b) => a.package.localeCompare(b.package));
}

/**
 * Index allowlist entries by advisory id, keeping the entry's declared scope.
 * @param {any} allowlist parsed .github/audit-allowlist.json
 * @returns {Map<string, any>}
 */
function indexAllowlist(allowlist) {
  const byId = new Map();
  const entries = (allowlist && Array.isArray(allowlist.exceptions)) ? allowlist.exceptions : [];
  for (const entry of entries) {
    const id = extractGhsaId(entry && entry.advisory) || String((entry && entry.advisory) || '').toUpperCase();
    if (id) byId.set(id, entry);
  }
  return byId;
}

/**
 * Decide whether the audit result passes.
 *
 * A finding is waived only when EVERY advisory behind it is waived — a package flagged for both
 * a waived and an un-waived advisory still blocks. `production` findings additionally require the
 * exception to declare `scope: "production"`, so widening a lint-toolchain waiver can never
 * silently cover the request path.
 *
 * @param {object} input
 * @param {any} input.productionAudit parsed `npm audit --omit=dev --json`
 * @param {any} input.fullAudit parsed `npm audit --json`
 * @param {any} input.allowlist parsed .github/audit-allowlist.json
 * @param {string} input.today ISO date (YYYY-MM-DD) used for expiry comparison
 * @returns {{ ok: boolean, blocking: any[], waived: any[], expired: any[], stale: string[] }}
 */
function evaluateAudit({ productionAudit, fullAudit, allowlist, today }) {
  const byId = indexAllowlist(allowlist);
  const productionPackages = new Set(collectFindings(productionAudit).map((f) => f.package));

  const blocking = [];
  const waived = [];
  const usedIds = new Set();

  for (const finding of collectFindings(fullAudit)) {
    const scope = productionPackages.has(finding.package) ? 'production' : 'development';
    const reasons = [];

    if (finding.advisories.length === 0) {
      // No resolvable advisory means no reviewable identifier to waive against — never waive it.
      reasons.push('no advisory id resolved from npm audit output');
    }

    for (const id of finding.advisories) {
      const entry = byId.get(id);
      if (!entry) {
        reasons.push(`${id} is not in the allowlist`);
        continue;
      }
      usedIds.add(id);
      if (scope === 'production' && entry.scope !== 'production') {
        reasons.push(`${id} is waived for ${entry.scope || 'development'} only, but reaches production`);
        continue;
      }
      if (!isFuture(entry.expires, today)) {
        reasons.push(`${id} waiver expired on ${entry.expires || '(no expiry set)'}`);
      }
    }

    if (reasons.length > 0) blocking.push({ ...finding, scope, reasons });
    else waived.push({ ...finding, scope });
  }

  // Surfaced separately from `blocking`: an expired waiver on a finding that has since been fixed
  // is a bookkeeping problem, not a vulnerability, and must not read as one.
  const expired = [...byId.entries()]
    .filter(([, entry]) => !isFuture(entry.expires, today))
    .map(([id, entry]) => ({ advisory: id, expires: entry.expires || null }));

  const stale = [...byId.keys()].filter((id) => !usedIds.has(id));

  return { ok: blocking.length === 0 && expired.length === 0, blocking, waived, expired, stale };
}

/**
 * @param {unknown} expires ISO date string
 * @param {string} today ISO date string
 * @returns {boolean} true when the waiver is still within its review window
 */
function isFuture(expires, today) {
  if (!expires || !/^\d{4}-\d{2}-\d{2}$/.test(String(expires))) return false;
  return String(expires) > String(today);
}

module.exports = { evaluateAudit, collectFindings, resolveAdvisories, extractGhsaId, isFuture };
