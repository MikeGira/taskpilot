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

/**
 * Markers prepareContent() injects when it shrinks a file to fit the token budget.
 * They are pipeline artifacts and do not exist in the real source.
 */
const TRUNCATION_MARKERS = [
  'long string omitted',
  'middle section omitted',
];

/**
 * Drop findings that are really complaints about our own truncation markers.
 *
 * audit-code-quality.js already TELLS the model these markers are synthetic and must not be
 * flagged. On 2026-08-02 it flagged one anyway (issue #101: "contains `/* ...long string
 * omitted... *\/` which is a token-reduction marker, not real code"), and issues #10-#12
 * before it were the same class. A prompt instruction is a request, not a guarantee — the
 * grounding standard is explicit that a rule enforced only by "the prompt says not to" is an
 * unfinished design. This is the deterministic backstop: whatever the model says, a finding
 * that cites a marker we injected ourselves can never reach a GitHub issue.
 *
 * Drops a whole finding, not a paragraph. A finding is a header plus the body under it, so
 * splitting on blank lines alone would drop the body and leave the orphaned header behind —
 * still enough to file a meaningless issue. Blocks are regrouped under the nearest preceding
 * header first. Prose-only output (audit-pilot-prompt.js) has no headers, so there each block
 * stands alone, which is the correct behaviour for that format.
 *
 * @param {unknown} modelResult raw text returned by the model
 * @returns {{ kept: string, dropped: string[] }}
 */
function stripTruncationArtifactFindings(modelResult) {
  const raw = String(modelResult == null ? '' : modelResult);
  if (!raw.trim()) return { kept: '', dropped: [] };

  // Header shapes the audit bots actually emit: **[CATEGORY] ...**, markdown headings,
  // and numbered or bulleted bold titles.
  const isHeader = (block) => /^\s*(?:\*\*\[|#{1,6}\s|\d+\.\s*\*\*|[-*]\s*\*\*)/.test(block);

  const findings = [];
  for (const block of raw.split(/\n\s*\n/)) {
    if (!findings.length || isHeader(block)) findings.push(block);
    else findings[findings.length - 1] += `\n\n${block}`;
  }

  const kept = [];
  const dropped = [];
  for (const finding of findings) {
    const lower = finding.toLowerCase();
    if (TRUNCATION_MARKERS.some((m) => lower.includes(m))) dropped.push(finding.trim());
    else kept.push(finding);
  }

  return { kept: kept.join('\n\n').trim(), dropped };
}

module.exports = { isAuditPass, stripTruncationArtifactFindings, TRUNCATION_MARKERS };
