'use strict';

/**
 * Pure planning logic for the automated dependency-remediation workflow.
 *
 * This encodes the judgement calls that were made by hand on 2026-07-27, because those are
 * exactly the ones a naive `npm audit fix` gets wrong:
 *
 *   1. NEVER `--force`. On 2026-07-27 the only "fix" npm offered for sharp's libvips advisory
 *      was to downgrade next from 15.5.22 to 14.2.35 — trading four image-decoder overflows for
 *      a year of unpatched framework CVEs. Any plan that lowers a direct dependency is rejected.
 *   2. Transitive packages pinned by a parent (sharp is an optional dependency of next at
 *      ^0.34.3) cannot be fixed by installing them; they need an `overrides` entry. Dependabot
 *      does not open PRs for this case at all, which is why it sat unfixed.
 *   3. Production reachability decides what gets fixed automatically. A lint-toolchain advisory
 *      is a dated human decision in .github/audit-allowlist.json, not something a bot silently
 *      rewrites the dependency tree for.
 *
 * Side-effect free (no npm, no network, no fs) so every rule above is unit-tested;
 * scripts/security-autofix.js owns running npm and talking to GitHub.
 */

const { collectFindings } = require('./audit-gate');

/**
 * Compare two version strings numerically, ignoring prerelease/build metadata.
 * Deliberately not a full semver implementation — this only needs to answer
 * "did this version go backwards", which is the safety property that matters.
 * @returns {number} negative when a < b, 0 when equal, positive when a > b
 */
function compareVersions(a, b) {
  const parse = (v) => String(v == null ? '' : v).split('-')[0].split('.').map((n) => Number(n) || 0);
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Choose the target version for a vulnerable package: the HIGHEST published `firstPatchedVersion`
 * that is ahead of what is installed and still inside the installed major line.
 *
 * Highest, not lowest. A package is usually flagged for several advisories at once — next carried
 * eight on 2026-07-27 — and each publishes its own first fix. Taking the lowest clears the
 * earliest advisory while silently leaving every later one unpatched, so the run would report
 * success and the next audit would re-flag the same package. Taking the highest in the line clears
 * all of them in one semver-compatible move.
 *
 * Staying inside the installed major is what keeps this safe to run unattended: a major bump is a
 * deliberate framework migration, so when the only fix is across a major boundary this returns
 * null and the finding is escalated to a human instead of auto-applied.
 *
 * Candidates come only from the GitHub Advisory API. Nothing here is a model's recollection of a
 * version number — that is the property that makes the output trustworthy without review.
 *
 * @param {string} installed currently resolved version
 * @param {string[]} firstPatchedVersions `firstPatchedVersion.identifier` values from the API
 * @returns {string|null} the version to move to, or null when no in-major fix is published
 */
function pickPatchedVersion(installed, firstPatchedVersions) {
  const installedMajor = majorOf(installed);
  const candidates = (firstPatchedVersions || [])
    .filter(Boolean)
    .filter((v) => compareVersions(v, installed) > 0 && majorOf(v) === installedMajor)
    .sort(compareVersions);
  return candidates.length > 0 ? candidates[candidates.length - 1] : null;
}

/** @param {string} version @returns {number} */
function majorOf(version) {
  return Number(String(version == null ? '' : version).split('-')[0].split('.')[0]) || 0;
}

/**
 * Build the remediation plan for the findings that are reachable from production.
 *
 * @param {object} input
 * @param {any} input.fullAudit parsed `npm audit --json`
 * @param {any} input.productionAudit parsed `npm audit --omit=dev --json`
 * @param {Record<string,string>} input.patchedVersions package -> lowest patched version,
 *        resolved from the GitHub Advisory API by the caller (never guessed)
 * @param {Record<string,string>} input.directDependencies package -> declared range
 * @param {Record<string,string>} [input.existingOverrides] current package.json `overrides`
 * @returns {{ directBumps: any[], overrides: any[], unfixable: any[], deferred: any[] }}
 */
function planRemediation({ fullAudit, productionAudit, patchedVersions, directDependencies, existingOverrides = {} }) {
  const productionPackages = new Set(collectFindings(productionAudit).map((f) => f.package));

  const directBumps = [];
  const overrides = [];
  const unfixable = [];
  const deferred = [];

  for (const finding of collectFindings(fullAudit)) {
    if (!productionPackages.has(finding.package)) {
      // Dev-only: a human decides via the dated allowlist. A bot must not rewrite the tree here.
      deferred.push({ ...finding, scope: 'development' });
      continue;
    }

    const patched = patchedVersions && patchedVersions[finding.package];
    if (!patched) {
      unfixable.push({ ...finding, reason: 'no patched version published for this advisory' });
      continue;
    }

    const existing = existingOverrides[finding.package];
    if (existing && compareVersions(stripRange(existing), patched) >= 0) {
      unfixable.push({ ...finding, reason: `override already pins ${existing}, which npm still reports as vulnerable` });
      continue;
    }

    const target = { package: finding.package, version: patched, advisories: finding.advisories };
    if (directDependencies && Object.prototype.hasOwnProperty.call(directDependencies, finding.package)) {
      directBumps.push(target);
    } else {
      // Transitive and therefore pinned by a parent: only an override can move it.
      overrides.push(target);
    }
  }

  return { directBumps, overrides, unfixable, deferred };
}

/** @param {string} range e.g. "^0.35.3" -> "0.35.3" */
function stripRange(range) {
  return String(range == null ? '' : range).replace(/^[\^~>=<\s]*/, '');
}

/**
 * Reject any plan whose result moved a dependency backwards.
 *
 * This is the guard against `npm audit fix --force`-style "remediation": a downgrade silently
 * reintroduces every vulnerability patched between the two versions, so it is never an
 * acceptable automated outcome even when it clears the current advisory.
 *
 * @param {Record<string,string>} before package -> resolved version, before the fix
 * @param {Record<string,string>} after package -> resolved version, after the fix
 * @returns {{ package: string, from: string, to: string }[]} empty when the plan is safe
 */
function detectDowngrades(before, after) {
  const downgrades = [];
  for (const [name, fromVersion] of Object.entries(before || {})) {
    const toVersion = after && after[name];
    if (!toVersion) continue;
    if (compareVersions(toVersion, fromVersion) < 0) {
      downgrades.push({ package: name, from: fromVersion, to: toVersion });
    }
  }
  return downgrades.sort((a, b) => a.package.localeCompare(b.package));
}

/**
 * Render the grounded change table for the PR body.
 *
 * Every value comes from the lockfile and the audit JSON — never from a model's recollection of
 * what "the latest patch" is. That is the specific failure this replaces: the 2026-07-27 monitor
 * email named next@15.5.21 (the real backport was 15.5.22) and postcss@8.5.18 (the advisory range
 * was <=8.5.17, so 8.5.18 would still have been vulnerable to re-report).
 *
 * @param {Record<string,string>} before package -> version
 * @param {Record<string,string>} after package -> version
 * @param {Record<string,string[]>} advisoriesByPackage
 * @returns {string} markdown table, or '' when nothing changed
 */
function renderChangeTable(before, after, advisoriesByPackage = {}) {
  const rows = [];
  for (const [name, toVersion] of Object.entries(after || {})) {
    const fromVersion = before && before[name];
    if (!fromVersion || fromVersion === toVersion) continue;
    const advisories = (advisoriesByPackage[name] || []).join(', ') || '—';
    rows.push(`| \`${name}\` | ${fromVersion} | **${toVersion}** | ${advisories} |`);
  }
  if (rows.length === 0) return '';
  return ['| Package | From | To | Advisories |', '|---|---|---|---|', ...rows.sort()].join('\n');
}

module.exports = { planRemediation, detectDowngrades, renderChangeTable, compareVersions, pickPatchedVersion };
