import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// Shared detector for the AI issue-filing bots (audit-code-quality.js, audit-pilot-prompt.js).
// It's a CommonJS script module; require it directly so the test exercises the exact code the
// bots run.
const require = createRequire(import.meta.url);
const { isAuditPass, stripTruncationArtifactFindings } = require('../../scripts/lib/audit-parse.js') as {
  isAuditPass: (r: unknown) => boolean;
  stripTruncationArtifactFindings: (r: unknown) => { kept: string; dropped: string[] };
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

// The exact second finding from issue #101 (2026-08-02): the bot flagged the pipeline's own
// token-reduction marker as if it were broken source. Issues #10-#12 were the same class.
const ISSUE_101_ARTIFACT_FINDING = `**[SIMPLIFICATION] \`stripe/route.ts\` — Truncated error message in purchase upsert**

Line starting with \`throw new Error(\` contains \`/* ...long string omitted... */\` which is a token-reduction marker, not real code. Verify the actual source: the error message should fully capture the \`purchaseError.message\` without gaps.`;

const REAL_FINDING = `**[SECURITY] \`checkout/route.ts\` — Missing rate limit**

The handler accepts unauthenticated POSTs with no per-IP throttle.`;

describe('stripTruncationArtifactFindings — drops complaints about our own markers', () => {
  it('drops the exact artifact finding from issue #101', () => {
    const { kept, dropped } = stripTruncationArtifactFindings(ISSUE_101_ARTIFACT_FINDING);
    expect(dropped).toHaveLength(1);
    expect(kept).toBe('');
  });

  it('drops the middle-section marker too', () => {
    const finding = 'The file has a `/* ...middle section omitted for brevity... */` gap, so it is malformed.';
    expect(stripTruncationArtifactFindings(finding).dropped).toHaveLength(1);
  });

  it('keeps real findings that sit alongside an artifact finding', () => {
    const { kept, dropped } = stripTruncationArtifactFindings(
      `${REAL_FINDING}\n\n${ISSUE_101_ARTIFACT_FINDING}`,
    );
    expect(dropped).toHaveLength(1);
    expect(kept).toContain('Missing rate limit');
    expect(kept).not.toContain('token-reduction marker');
  });

  it('leaves a clean findings list untouched', () => {
    const { kept, dropped } = stripTruncationArtifactFindings(REAL_FINDING);
    expect(dropped).toHaveLength(0);
    expect(kept).toBe(REAL_FINDING);
  });

  it('is case-insensitive', () => {
    expect(stripTruncationArtifactFindings('LONG STRING OMITTED here').dropped).toHaveLength(1);
  });

  it.each([['null', null], ['undefined', undefined], ['empty', '']])(
    'handles %s safely', (_label, input) => {
      expect(stripTruncationArtifactFindings(input)).toEqual({ kept: '', dropped: [] });
    },
  );

  it('an all-artifact response collapses to PASS, so no issue is filed', () => {
    const { kept } = stripTruncationArtifactFindings(ISSUE_101_ARTIFACT_FINDING);
    expect(isAuditPass(kept)).toBe(true);
  });
});
