#!/usr/bin/env node
'use strict';

/**
 * CI gate: the Node runtime is declared once, and that declaration is still supported.
 *
 * Exit 0 = pass. Exit 1 = a blocking finding. Exit 2 = the gate itself could not run
 * (never treated as a pass — a broken gate must not look like a clean check).
 *
 * See scripts/lib/node-runtime.js for why this exists.
 */

const fs = require('node:fs');
const path = require('node:path');
const { evaluateNodeRuntime } = require('./lib/node-runtime');

const ROOT = path.join(__dirname, '..');
const WORKFLOW_DIR = path.join(ROOT, '.github', 'workflows');

function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

  const workflows = fs
    .readdirSync(WORKFLOW_DIR)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((f) => ({
      path: `.github/workflows/${f}`,
      content: fs.readFileSync(path.join(WORKFLOW_DIR, f), 'utf8'),
    }));

  const result = evaluateNodeRuntime({
    enginesNode: pkg.engines && pkg.engines.node,
    workflows,
    today: new Date().toISOString().slice(0, 10),
  });

  for (const w of result.warnings) console.warn(`warning: ${w}`);
  for (const e of result.errors) console.error(`error: ${e}`);

  if (!result.ok) {
    console.error(`\nNode runtime gate FAILED (${result.errors.length} blocking).`);
    process.exit(1);
  }

  console.log(
    `Node runtime gate passed — engines.node pins ${result.major}.x, ` +
      `${workflows.length} workflow file(s) defer to it.`,
  );
}

try {
  main();
} catch (err) {
  console.error(`Node runtime gate could not run: ${err && err.message}`);
  process.exit(2);
}
