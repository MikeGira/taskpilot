#!/usr/bin/env node
'use strict';

/**
 * Automated dependency remediation.
 *
 * Replaces the manual loop this repo ran until 2026-07-27: a scheduled monitor emails a prose
 * report, a human reads it, verifies the version numbers (which were wrong), applies the fix, and
 * opens a PR. Everything in that loop except the final review is mechanical, so it runs here.
 *
 * The workflow is deliberately conservative. It only auto-remediates findings reachable from
 * PRODUCTION dependencies, it never runs `npm audit fix --force`, it aborts if any dependency
 * moved backwards, and it proves the tree still builds and passes tests before opening anything.
 * When it cannot produce a safe fix it files ONE grounded tracking issue instead of guessing.
 *
 * Exit 0 in every non-crash path: a repo with an unfixable advisory is a situation to report, not
 * a scheduled job to fail. The CI audit gate (scripts/audit-gate.js) is what blocks merges.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { planRemediation, detectDowngrades, renderChangeTable, pickPatchedVersion } = require('./lib/security-autofix');
const { collectFindings } = require('./lib/audit-gate');

const REPO = process.env.GITHUB_REPOSITORY || 'MikeGira/taskpilot';
const BRANCH = 'chore/security-autofix';
const ISSUE_TITLE = 'Security autofix: manual remediation required';
const ROOT = path.join(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// Only npm needs a shell on Windows (it resolves to npm.cmd). Using one for gh as well would
// re-split the GraphQL query on its spaces, which silently breaks advisory lookup on a local run.
const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    shell: cmd === 'npm' && process.platform === 'win32',
    ...opts,
  });

/** `npm audit` exits non-zero whenever it finds anything, so only stdout carries signal. */
function audit(args = []) {
  let out;
  try {
    out = sh('npm', ['audit', '--json', ...args]);
  } catch (err) {
    out = err && err.stdout;
  }
  if (!out) throw new Error(`npm audit ${args.join(' ')} produced no output`);
  return JSON.parse(out);
}

/** Resolved version of every package in the tree, keyed by package name. */
function lockfileVersions() {
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
  const versions = {};
  for (const [location, meta] of Object.entries(lock.packages || {})) {
    if (!location.startsWith('node_modules/')) continue;
    const name = location.slice(location.lastIndexOf('node_modules/') + 'node_modules/'.length);
    // Nested duplicates: keep the shallowest copy, which is what the app resolves to.
    if (!(name in versions)) versions[name] = meta.version;
  }
  return versions;
}

function packageJson() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
}

/**
 * Ask the GitHub Advisory API for the published patched versions of a package.
 * This is the ONLY source of target versions — see pickPatchedVersion for why.
 */
function firstPatchedVersions(pkg) {
  const query = `{ securityVulnerabilities(first: 100, ecosystem: NPM, package: "${pkg}") { nodes { firstPatchedVersion { identifier } } } }`;
  try {
    const out = sh('gh', ['api', 'graphql', '-f', `query=${query}`, '--jq', '.data.securityVulnerabilities.nodes[].firstPatchedVersion.identifier']);
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch (err) {
    console.error(`  could not resolve patched versions for ${pkg}: ${err && err.message}`);
    return [];
  }
}

function gh(args) {
  return sh('gh', args);
}

/** Keep exactly one open tracking issue rather than a new one per run. */
function upsertIssue(body) {
  const existing = gh(['issue', 'list', '--repo', REPO, '--state', 'open', '--search', `"${ISSUE_TITLE}" in:title`, '--json', 'number', '--jq', '.[0].number']).trim();
  if (existing) {
    gh(['issue', 'comment', existing, '--repo', REPO, '--body', body]);
    console.log(`Updated tracking issue #${existing}`);
    return;
  }
  gh(['issue', 'create', '--repo', REPO, '--title', ISSUE_TITLE, '--label', 'dependencies', '--body', body]);
  console.log('Opened tracking issue');
}

function verifyTree() {
  for (const script of ['typecheck', 'test', 'build']) {
    console.log(`  verifying: npm run ${script}`);
    sh('npm', ['run', script], { stdio: 'inherit', env: { ...process.env, ...BUILD_ENV } });
  }
}

// The build needs public config to be present; these are the same non-secret placeholders the
// CI build job uses, and never reach a deployment.
const BUILD_ENV = {
  NEXT_PUBLIC_SITE_URL: 'https://taskpilot.vercel.app',
  NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-placeholder-not-a-secret',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_placeholder',
  ANTHROPIC_API_KEY: 'sk-ant-placeholder',
};

function main() {
  const before = lockfileVersions();
  const pkg = packageJson();
  const directDependencies = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  const productionAudit = audit(['--omit=dev']);
  const productionFindings = collectFindings(productionAudit);

  if (productionFindings.length === 0) {
    console.log('No high or critical findings reachable from production dependencies. Nothing to remediate.');
    return;
  }

  console.log(`${productionFindings.length} production finding(s): ${productionFindings.map((f) => f.package).join(', ')}`);

  // Step 1 — let npm resolve whatever it can WITHOUT --force. --force is banned outright: on
  // 2026-07-27 its only proposal was downgrading next 15.5.22 -> 14.2.35.
  console.log('Running npm audit fix (never --force)...');
  try {
    sh('npm', ['audit', 'fix'], { stdio: 'inherit' });
  } catch {
    console.log('  npm audit fix reported remaining issues; continuing to the override plan.');
  }

  // Step 2 — plan overrides for what npm could not move, using advisory-sourced versions.
  const remaining = audit([]);
  const remainingProduction = audit(['--omit=dev']);
  const installed = lockfileVersions();
  const patchedVersions = {};
  for (const finding of collectFindings(remainingProduction)) {
    const target = pickPatchedVersion(installed[finding.package], firstPatchedVersions(finding.package));
    if (target) patchedVersions[finding.package] = target;
  }

  const plan = planRemediation({
    fullAudit: remaining,
    productionAudit: remainingProduction,
    patchedVersions,
    directDependencies,
    existingOverrides: pkg.overrides || {},
  });

  for (const bump of plan.directBumps) {
    console.log(`  bumping direct dependency ${bump.package} -> ^${bump.version}`);
    if (!DRY_RUN) sh('npm', ['install', `${bump.package}@^${bump.version}`]);
  }
  for (const override of plan.overrides) {
    console.log(`  overriding transitive ${override.package} -> ^${override.version}`);
    if (!DRY_RUN) sh('npm', ['pkg', 'set', `overrides.${override.package}=^${override.version}`]);
  }
  if (!DRY_RUN && plan.overrides.length > 0) sh('npm', ['install']);

  if (DRY_RUN) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  // Step 3 — safety rails. A downgrade is never an acceptable automated outcome, and an
  // unverified tree is never opened as a PR.
  const after = lockfileVersions();
  const downgrades = detectDowngrades(before, after);
  if (downgrades.length > 0) {
    sh('git', ['checkout', '--', 'package.json', 'package-lock.json']);
    upsertIssue(buildFailureBody(plan, `The computed fix would have DOWNGRADED ${downgrades.map((d) => `\`${d.package}\` ${d.from} -> ${d.to}`).join(', ')}. A downgrade reintroduces every vulnerability patched in between, so the change was reverted and nothing was opened.`));
    return;
  }

  const changed = sh('git', ['status', '--porcelain', 'package.json', 'package-lock.json']).trim();
  if (!changed) {
    upsertIssue(buildFailureBody(plan, 'npm could not move any of the vulnerable packages, and no override was available. This needs a human decision.'));
    return;
  }

  try {
    verifyTree();
  } catch (err) {
    sh('git', ['checkout', '--', 'package.json', 'package-lock.json']);
    upsertIssue(buildFailureBody(plan, `The remediated tree failed verification (\`${err && err.message}\`), so it was reverted rather than opened as a PR.`));
    return;
  }

  // Step 4 — the fix is real, minimal, and verified. Open it for the normal CI gates to judge.
  const advisoriesByPackage = {};
  for (const finding of productionFindings) advisoriesByPackage[finding.package] = finding.advisories;
  const table = renderChangeTable(before, after, advisoriesByPackage);

  sh('git', ['config', 'user.name', 'github-actions[bot]']);
  sh('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
  sh('git', ['checkout', '-B', BRANCH]);
  sh('git', ['add', 'package.json', 'package-lock.json']);
  sh('git', ['commit', '-m', 'chore(security): apply verified dependency remediation\n\nOpened automatically by scripts/security-autofix.js. Versions come from the\nGitHub Advisory API, not from a model. The tree was type-checked, tested and\nbuilt before this branch was pushed.']);
  sh('git', ['push', '--force-with-lease', 'origin', BRANCH]);

  const body = [
    'Automated dependency remediation for findings reachable from **production** dependencies.',
    '',
    table,
    '',
    '### How this was produced',
    '- Target versions come from `firstPatchedVersion` on the GitHub Advisory API and are the *lowest* published fix ahead of what was installed, so the upgrade is both minimal and real.',
    '- `npm audit fix --force` is never used. It is what proposed downgrading `next` to 14.2.35 on 2026-07-27.',
    '- The resolved tree was checked for downgrades, then type-checked, unit-tested and built before this branch was pushed.',
    '',
    plan.deferred.length > 0
      ? `Development-only findings were left alone for a dated decision in \`.github/audit-allowlist.json\`: ${plan.deferred.map((d) => `\`${d.package}\``).join(', ')}.`
      : '',
    '',
    'Auto-merges once the required checks pass.',
  ].filter(Boolean).join('\n');

  const existingPr = gh(['pr', 'list', '--repo', REPO, '--head', BRANCH, '--state', 'open', '--json', 'number', '--jq', '.[0].number']).trim();
  if (existingPr) {
    gh(['pr', 'edit', existingPr, '--repo', REPO, '--body', body]);
    console.log(`Updated PR #${existingPr}`);
  } else {
    gh(['pr', 'create', '--repo', REPO, '--base', 'main', '--head', BRANCH, '--title', 'chore(security): automated dependency remediation', '--label', 'dependencies', '--body', body]);
    const created = gh(['pr', 'list', '--repo', REPO, '--head', BRANCH, '--state', 'open', '--json', 'number', '--jq', '.[0].number']).trim();
    gh(['pr', 'merge', '--auto', '--squash', created, '--repo', REPO]);
    console.log(`Opened PR #${created} with auto-merge enabled`);
  }
}

function buildFailureBody(plan, reason) {
  const lines = [
    `## Automated remediation could not complete (${new Date().toISOString().slice(0, 10)})`,
    '',
    reason,
    '',
  ];
  if (plan.unfixable.length > 0) {
    lines.push('### No safe fix available', '');
    for (const item of plan.unfixable) {
      lines.push(`- \`${item.package}\` (${item.severity}) — ${item.advisories.join(', ') || 'no advisory id'} — ${item.reason}`);
    }
    lines.push('');
  }
  lines.push(
    'Every value above is read from `npm audit --json` and the GitHub Advisory API. Nothing here is a model\'s recollection of a version number.',
    '',
    'If the finding genuinely has no compatible fix, record a dated, scoped exception in `.github/audit-allowlist.json` — the CI gate fails when it lapses.',
  );
  return lines.join('\n');
}

main();
