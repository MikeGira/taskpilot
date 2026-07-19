import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// Shared detector for the AI issue-filing bots (audit-code-quality.js, audit-pilot-prompt.js).
// It's a CommonJS script module; require it directly so the test exercises the exact code the
// bots run.
const require = createRequire(import.meta.url);
const { isAuditPass } = require('../../scripts/lib/audit-parse.js') as {
  isAuditPass: (r: unknown) => boolean;
};

// The exact body that filed noise issue #74: "PASS" followed by an explanatory summary.
const ISSUE_74_BODY = `PASS

I've reviewed all six route handlers against the stated criteria:
- checkout/route.ts: Anonymous checkout is a documented design decision.
- stripe/route.ts: Webhook signature verification is correct.
No actionable security gaps, missing validations, unsafe patterns, or consolidatable duplication.`;

describe('isAuditPass — no-findings detection for issue-filing bots', () => {
  describe('treats as PASS (must NOT file an issue)', () => {
    it.each([
      ['bare PASS', 'PASS'],
      ['lowercase', 'pass'],
      ['bold', '**PASS**'],
      ['with period', 'PASS.'],
      ['with trailing whitespace/newlines', '  PASS  \n'],
      ['issue #74 body (PASS + trailing prose)', ISSUE_74_BODY],
      ['PASS on its own last line', 'Everything checked out.\n\nPASS'],
      ['empty string', ''],
      ['whitespace only', '   \n  \t'],
    ])('%s', (_label, input) => {
      expect(isAuditPass(input)).toBe(true);
    });

    it('handles null/undefined without throwing', () => {
      expect(isAuditPass(null)).toBe(true);
      expect(isAuditPass(undefined)).toBe(true);
    });
  });

  describe('treats as findings (MUST file an issue)', () => {
    it.each([
      ['structured category marker (audit-code-quality format)', '**[SECURITY]** `generate/route.ts` — Missing auth check\nAdd a getUser() guard.'],
      ['free prose gap (audit-pilot-prompt format)', 'The system prompt does not mention the /workflow generator, which users need to know about.'],
      ['PASS qualified on the first line, finding after', 'PASS on 5 of 6 files.\n\n**[SECURITY]** `x` — issue'],
      ['a finding that merely contains the word pass', 'The password field is logged in plaintext — remove it.'],
      ['leads with a finding, unrelated tail', '**[DUPLICATION]** repeated retry logic\nConsolidate into a helper.'],
    ])('%s', (_label, input) => {
      expect(isAuditPass(input)).toBe(false);
    });
  });
});
