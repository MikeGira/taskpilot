'use strict';

/**
 * Pure helpers for the golden-generation CI check (grounding L4 slice).
 *
 * The workflow generates a handful of scripts from the LIVE prompt and runs each through the
 * real validator for its language (shellcheck, py_compile, PSScriptAnalyzer, terraform validate),
 * so a prompt regression that starts producing broken code is caught before users hit it. This
 * module holds the two pieces worth unit-testing on their own: choosing the validator for a
 * language, and interpreting a validator run into pass/fail. The subprocess execution and the
 * live generation call live in scripts/golden-generation.js.
 *
 * The interpretation is deliberately lenient — it fails only on hard ERRORS, never on style
 * warnings — because the generator is non-deterministic and legitimate output varies. We assert
 * validity, not exact content.
 */

/**
 * @typedef {Object} Validator
 * @property {string} tool      human name of the validator
 * @property {string} ext       file extension to write the script under
 * @property {boolean} available whether the language is covered by a validator here
 */

/** @type {Record<string, Validator>} */
const VALIDATORS = {
  bash: { tool: 'shellcheck', ext: '.sh', available: true },
  python: { tool: 'py_compile', ext: '.py', available: true },
  powershell: { tool: 'PSScriptAnalyzer', ext: '.ps1', available: true },
  terraform: { tool: 'terraform validate', ext: '.tf', available: true },
};

/**
 * @param {string} language language value from the generation result
 * @returns {Validator} descriptor; `available:false` means "no validator wired for this language"
 */
function validatorFor(language) {
  return VALIDATORS[language] || { tool: 'none', ext: '.txt', available: false };
}

/**
 * Interpret a shellcheck JSON run. Fails only on error-severity comments.
 * @param {string} stdout shellcheck --format=json output
 * @returns {{ ok: boolean, errors: string[] }}
 */
function interpretShellcheck(stdout) {
  let comments;
  try { comments = JSON.parse(stdout || '[]'); } catch { return { ok: true, errors: [] }; }
  const errors = (Array.isArray(comments) ? comments : [])
    .filter((c) => c.level === 'error')
    .map((c) => `SC${c.code} (line ${c.line}): ${c.message}`);
  return { ok: errors.length === 0, errors };
}

/**
 * Interpret PSScriptAnalyzer JSON output. Fails only on ParseError / Error severity.
 * PSSA severities: 0=Information, 1=Warning, 2=Error, 3=ParseError.
 * @param {string} stdout JSON array from ConvertTo-Json of Invoke-ScriptAnalyzer
 * @returns {{ ok: boolean, errors: string[] }}
 */
function interpretPSScriptAnalyzer(stdout) {
  let records;
  try { records = JSON.parse(stdout || '[]'); } catch { return { ok: true, errors: [] }; }
  const arr = Array.isArray(records) ? records : [records];
  const errors = arr
    .filter((r) => r && (r.Severity === 2 || r.Severity === 3 || r.Severity === 'Error' || r.Severity === 'ParseError'))
    .map((r) => `${r.RuleName} (line ${r.Line}): ${r.Message}`);
  return { ok: errors.length === 0, errors };
}

module.exports = { VALIDATORS, validatorFor, interpretShellcheck, interpretPSScriptAnalyzer };
