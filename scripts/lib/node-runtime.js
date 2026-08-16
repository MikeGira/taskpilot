'use strict';

/**
 * Node runtime version gate.
 *
 * The Node major a project actually builds with used to be declared in four independent
 * places: the Vercel dashboard, package.json `engines.node`, and every workflow's
 * `node-version:`. Nothing compared them, so they silently disagreed — on 2026-08-14 Vercel
 * emailed that Node 20 stops building on 2026-10-01, and the dashboard "upgrade all" button
 * could not fix it, because `engines.node` overrides the dashboard setting. That is an update
 * anomaly from denormalized data, so the fix is normalization, not vigilance:
 *
 *   `engines.node` is the single source of truth. Workflows point at it with
 *   `node-version-file: 'package.json'` (actions/setup-node reads `engines.node`) and this
 *   gate proves both that nothing re-hardcodes a version and that the one declaration
 *   still names a runtime that is actually supported.
 *
 * The schedule below is embedded rather than fetched so the gate cannot go red on a network
 * blip. Node publishes these dates years ahead and does not move them, and an unknown major
 * is a hard failure rather than a pass — so it cannot silently approve a version it has never
 * heard of.
 *
 * Sources (verified 2026-08-16):
 *   https://github.com/nodejs/Release/blob/main/schedule.json
 *   https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
 *   https://vercel.com/changelog/node-js-20-is-being-deprecated
 */

/** Upstream Node.js release schedule. `maintenance` = security fixes only. `end` = EOL. */
const NODE_SCHEDULE = {
  20: { maintenance: '2024-10-22', end: '2026-04-30' },
  22: { maintenance: '2025-10-21', end: '2027-04-30' },
  24: { maintenance: '2026-10-20', end: '2028-04-30' },
};

/**
 * Majors Vercel still accepts for Builds and Functions, and the date each stops working.
 * `null` = no announced removal. A major absent from this map is not offered at all.
 */
const VERCEL_SUPPORT = {
  20: { removedOn: '2026-10-01' },
  22: { removedOn: null },
  24: { removedOn: null },
};

/**
 * `engines.node` is a semver range, but Vercel resolves it to exactly one major (`24.x`,
 * `^24.0.0` and `>=20.0.0` all deploy the latest 24.x). Only the pinned-major forms are
 * accepted here: an open range like `>=20` reads as "20 is fine" while deploying 24, which is
 * the ambiguity this gate exists to remove.
 * @param {unknown} range
 * @returns {{ major: number } | { error: string }}
 */
function parseEnginesNode(range) {
  if (typeof range !== 'string' || range.trim() === '') {
    return { error: 'package.json has no "engines.node" declaration' };
  }
  const value = range.trim();
  const match = /^(?:\^)?(\d+)(?:\.x|\.0\.0)$/.exec(value);
  if (!match) {
    return {
      error:
        `"engines.node": ${JSON.stringify(value)} is not a single pinned major. ` +
        'Use "24.x" (or "^24.0.0") so the deployed runtime is unambiguous.',
    };
  }
  return { major: Number(match[1]) };
}

/**
 * @param {number} major
 * @param {string} today ISO date
 * @returns {{ level: 'error' | 'warn' | 'ok', message: string }}
 */
function checkMajor(major, today) {
  const schedule = NODE_SCHEDULE[major];
  const vercel = VERCEL_SUPPORT[major];

  if (!schedule || !vercel) {
    return {
      level: 'error',
      message:
        `Node ${major} is not in this gate's schedule. Add it to NODE_SCHEDULE and ` +
        'VERCEL_SUPPORT in scripts/lib/node-runtime.js, citing the upstream sources.',
    };
  }

  if (today >= schedule.end) {
    return {
      level: 'error',
      message:
        `Node ${major} reached end-of-life on ${schedule.end} and receives no security ` +
        'updates. Move engines.node to a supported major.',
    };
  }

  if (vercel.removedOn && today >= vercel.removedOn) {
    return {
      level: 'error',
      message: `Vercel stopped building Node ${major} on ${vercel.removedOn}. New deployments fail.`,
    };
  }

  if (vercel.removedOn) {
    return {
      level: 'error',
      message:
        `Vercel stops building Node ${major} on ${vercel.removedOn} — new deployments will ` +
        'fail from that date. Move engines.node to a supported major now.',
    };
  }

  if (today >= schedule.maintenance) {
    return {
      level: 'warn',
      message:
        `Node ${major} entered maintenance on ${schedule.maintenance} (security fixes only, ` +
        `EOL ${schedule.end}). Plan the move to the current Active LTS.`,
    };
  }

  return { level: 'ok', message: `Node ${major} is Active LTS (EOL ${schedule.end}).` };
}

/**
 * A workflow that hardcodes `node-version:` reintroduces the copy this gate removed — it can
 * drift from engines.node without anything noticing, which is the original defect.
 * @param {{ path: string, content: string }[]} workflows
 * @returns {{ path: string, line: number, text: string }[]}
 */
function findHardcodedVersions(workflows) {
  const offenders = [];
  for (const { path: file, content } of workflows) {
    content.split(/\r?\n/).forEach((text, index) => {
      if (/^\s*node-version:\s*\S/.test(text)) {
        offenders.push({ path: file, line: index + 1, text: text.trim() });
      }
    });
  }
  return offenders;
}

/**
 * @param {{ enginesNode: unknown, workflows: {path: string, content: string}[], today: string }} input
 * @returns {{ ok: boolean, errors: string[], warnings: string[], major: number | null }}
 */
function evaluateNodeRuntime({ enginesNode, workflows, today }) {
  const errors = [];
  const warnings = [];

  const parsed = parseEnginesNode(enginesNode);
  if ('error' in parsed) {
    return { ok: false, errors: [parsed.error], warnings, major: null };
  }

  const verdict = checkMajor(parsed.major, today);
  if (verdict.level === 'error') errors.push(verdict.message);
  if (verdict.level === 'warn') warnings.push(verdict.message);

  for (const o of findHardcodedVersions(workflows)) {
    errors.push(
      `${o.path}:${o.line} hardcodes \`${o.text}\`. Use ` +
        "`node-version-file: 'package.json'` so there is one declaration to keep current.",
    );
  }

  return { ok: errors.length === 0, errors, warnings, major: parsed.major };
}

module.exports = {
  NODE_SCHEDULE,
  VERCEL_SUPPORT,
  parseEnginesNode,
  checkMajor,
  findHardcodedVersions,
  evaluateNodeRuntime,
};
