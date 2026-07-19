'use strict';

/**
 * Decide whether an LLM audit result reports "no findings" (a PASS).
 *
 * The contract handed to the model is: respond with exactly "PASS" when everything is
 * clean. Models frequently comply and then keep explaining
 * ("PASS\n\nI reviewed all six handlers…"). A naive whole-string or last-line-only check
 * misreads that trailing prose as findings and files a spurious GitHub issue — that is
 * exactly what produced noise issue #74.
 *
 * The reliable signal is a lone "PASS" line at the START or END of the markdown-stripped
 * output. A genuine findings response leads with a finding, never a bare "PASS" line.
 *
 * Deliberately format-agnostic: audit-code-quality.js emits `**[CATEGORY]**` markers while
 * audit-pilot-prompt.js returns free prose, so this must not depend on any finding format.
 * Both issue-filing bots share this one function so the fix cannot drift between them.
 *
 * @param {unknown} modelResult raw text returned by the model
 * @returns {boolean} true when there are no findings to file
 */
function isAuditPass(modelResult) {
  const stripped = String(modelResult == null ? '' : modelResult)
    .replace(/[*_`~]/g, '')
    .trim();

  // An empty result is not a finding — filing an empty issue is worse than filing none.
  if (!stripped) return true;

  const lines = stripped.split('\n').map((l) => l.trim()).filter(Boolean);
  const isPassLine = (line) => /^pass[.!]?$/i.test(line || '');

  return isPassLine(lines[0]) || isPassLine(lines[lines.length - 1]);
}

module.exports = { isAuditPass };
