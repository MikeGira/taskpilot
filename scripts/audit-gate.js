#!/usr/bin/env node
'use strict';

/**
 * CI dependency-audit gate.
 *
 * Runs `npm audit` twice — once scoped to production dependencies, once over everything — and
 * evaluates both against .github/audit-allowlist.json. See scripts/lib/audit-gate.js for why
 * the plain `npm audit --audit-level=high` gate had to be replaced.
 *
 * Exit 0 = pass. Exit 1 = a blocking finding or an expired waiver. Exit 2 = the gate itself
 * could not run (never treated as a pass — a broken gate must not look like a clean audit).
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { evaluateAudit } = require('./lib/audit-gate');

const ALLOWLIST_PATH = path.join(__dirname, '..', '.github', 'audit-allowlist.json');

/**
 * `npm audit` exits non-zero whenever it finds anything, so the exit code carries no
 * signal here and only stdout is used. A missing/unparseable body is a gate failure.
 * @param {string[]} args
 */
function runAudit(args) {
  let stdout;
  try {
    stdout = execFileSync('npm', ['audit', '--json', ...args], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      shell: process.platform === 'win32',
    });
  } catch (err) {
    stdout = err && err.stdout;
  }
  if (!stdout) throw new Error(`npm audit ${args.join(' ')} produced no output`);
  return JSON.parse(stdout);
}

function main() {
  const today = new Date().toISOString().slice(0, 10);
  const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));

  const result = evaluateAudit({
    productionAudit: runAudit(['--omit=dev']),
    fullAudit: runAudit([]),
    allowlist,
    today,
  });

  for (const f of result.waived) {
    console.log(`WAIVED   [${f.scope}] ${f.package} (${f.severity}) — ${f.advisories.join(', ')}`);
  }
  for (const f of result.blocking) {
    console.error(`BLOCKING [${f.scope}] ${f.package} (${f.severity}) — ${f.reasons.join('; ')}`);
  }
  for (const e of result.expired) {
    console.error(`EXPIRED  ${e.advisory} — waiver lapsed on ${e.expires}. Re-review it, then extend or remove the entry.`);
  }
  for (const id of result.stale) {
    console.log(`STALE    ${id} — no longer reported by npm audit; remove it from the allowlist.`);
  }

  if (!result.ok) {
    console.error('\nDependency audit gate FAILED. Fix the finding, or add a dated, scoped exception to .github/audit-allowlist.json with a reviewed justification.');
    process.exit(1);
  }
  console.log(`\nDependency audit gate passed (${result.waived.length} waived, 0 blocking).`);
}

try {
  main();
} catch (err) {
  console.error(`Dependency audit gate could not run: ${err && err.message}`);
  process.exit(2);
}
