import { describe, it, expect } from 'vitest';
import nextConfig from '../../next.config.mjs';

// ZAP rule 10055 covers three distinct CSP faults — no-fallback directives, wildcard
// directives, and unsafe-inline — under ONE rule id. Because unsafe-inline is an
// accepted known weakness (see .zap/rules.tsv), 10055 has to be ignored wholesale,
// which would silently drop DAST coverage of the other two. These assertions replace
// that coverage deterministically: they are faster than a scan and name the exact
// property, so a regression fails with an obvious message instead of a scanner diff.

async function cspFor(path: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headers = await (nextConfig as any).headers();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entry = headers.find((h: any) => new RegExp(`^${h.source.replace('(.*)', '.*')}$`).test(path));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const csp = entry?.headers.find((x: any) => x.key === 'Content-Security-Policy');
  return csp?.value ?? '';
}

describe('Content-Security-Policy invariants', () => {
  it('defines the directives that do NOT fall back to default-src', async () => {
    const csp = await cspFor('/');
    // Omitting either leaves it completely unrestricted — default-src does not cover them.
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('has no scheme-wide wildcard sources', async () => {
    const csp = await cspFor('/');
    for (const directive of csp.split(';').map(d => d.trim())) {
      // `https:` / `http:` as a bare source permits ANY origin on that scheme.
      expect(directive, `wildcard scheme in: ${directive}`).not.toMatch(/(^|\s)https?:(\s|$)/);
      expect(directive, `bare wildcard in: ${directive}`).not.toMatch(/(^|\s)\*(\s|$)/);
    }
  });

  it('keeps the baseline hardening directives', async () => {
    const csp = await cspFor('/');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  // Documents the known gap so it is visible in the suite rather than only in a
  // scanner ignore file. Flip this to `.not.toContain` when nonce-based CSP lands —
  // the failure is the reminder that the ZAP ignore for 10055 can then be removed.
  it('KNOWN GAP: script-src still allows unsafe-inline', async () => {
    const csp = await cspFor('/');
    expect(csp).toContain("'unsafe-inline'");
  });
});
