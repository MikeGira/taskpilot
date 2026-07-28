import { describe, it, expect } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { evaluateAudit, collectFindings, resolveAdvisories, extractGhsaId, isFuture } = require('../../scripts/lib/audit-gate');

const TODAY = '2026-07-27';

const advisory = (url: string, severity = 'high') => ({ source: 1, url, severity, title: 'x' });

/** Mirrors npm's shape: a chain of packages vulnerable only *through* a leaf advisory. */
function chainAudit() {
  return {
    vulnerabilities: {
      'brace-expansion': {
        severity: 'high',
        isDirect: false,
        via: [advisory('https://github.com/advisories/GHSA-mh99-v99m-4gvg')],
      },
      minimatch: { severity: 'high', isDirect: false, via: ['brace-expansion'] },
      eslint: { severity: 'high', isDirect: true, via: ['minimatch'] },
    },
  };
}

const waiver = (over: Record<string, unknown> = {}) => ({
  exceptions: [
    {
      advisory: 'GHSA-mh99-v99m-4gvg',
      scope: 'development',
      expires: '2026-10-27',
      justification: 'dev-only',
      ...over,
    },
  ],
});

describe('extractGhsaId', () => {
  it('pulls the id out of an advisory URL and normalises case', () => {
    expect(extractGhsaId('https://github.com/advisories/GHSA-mh99-v99m-4gvg')).toBe('GHSA-MH99-V99M-4GVG');
  });

  it('returns null for missing or non-advisory URLs', () => {
    expect(extractGhsaId(undefined)).toBeNull();
    expect(extractGhsaId('https://example.com/nope')).toBeNull();
  });
});

describe('resolveAdvisories', () => {
  it('follows string `via` links down to the root advisory', () => {
    expect(resolveAdvisories(chainAudit().vulnerabilities, 'eslint')).toEqual(['GHSA-MH99-V99M-4GVG']);
  });

  it('terminates on cyclic dependency chains', () => {
    const vulns = {
      a: { severity: 'high', via: ['b'] },
      b: { severity: 'high', via: ['a', advisory('https://github.com/advisories/GHSA-r28c-9q8g-f849')] },
    };
    expect(resolveAdvisories(vulns, 'a')).toEqual(['GHSA-R28C-9Q8G-F849']);
  });
});

describe('collectFindings', () => {
  it('ignores anything below high severity', () => {
    const audit = {
      vulnerabilities: {
        low: { severity: 'moderate', via: [advisory('https://github.com/advisories/GHSA-q8wf-6r8g-63ch', 'moderate')] },
        bad: { severity: 'critical', via: [advisory('https://github.com/advisories/GHSA-r28c-9q8g-f849', 'critical')] },
      },
    };
    expect(collectFindings(audit).map((f: { package: string }) => f.package)).toEqual(['bad']);
  });

  it('returns an empty list for a clean audit', () => {
    expect(collectFindings({ vulnerabilities: {} })).toEqual([]);
  });
});

describe('evaluateAudit', () => {
  it('waives an entire dependency chain from the single leaf advisory', () => {
    const result = evaluateAudit({
      productionAudit: { vulnerabilities: {} },
      fullAudit: chainAudit(),
      allowlist: waiver(),
      today: TODAY,
    });
    expect(result.ok).toBe(true);
    expect(result.waived).toHaveLength(3);
    expect(result.blocking).toEqual([]);
  });

  it('blocks an advisory that is not in the allowlist', () => {
    const result = evaluateAudit({
      productionAudit: { vulnerabilities: {} },
      fullAudit: chainAudit(),
      allowlist: { exceptions: [] },
      today: TODAY,
    });
    expect(result.ok).toBe(false);
    expect(result.blocking).toHaveLength(3);
    expect(result.blocking[0].reasons[0]).toContain('not in the allowlist');
  });

  // The control that matters most: a lint-toolchain waiver must never cover the request path.
  it('refuses to let a development-scoped waiver cover a production finding', () => {
    const prod = {
      vulnerabilities: {
        'brace-expansion': {
          severity: 'high',
          via: [advisory('https://github.com/advisories/GHSA-mh99-v99m-4gvg')],
        },
      },
    };
    const result = evaluateAudit({
      productionAudit: prod,
      fullAudit: prod,
      allowlist: waiver(),
      today: TODAY,
    });
    expect(result.ok).toBe(false);
    expect(result.blocking[0].scope).toBe('production');
    expect(result.blocking[0].reasons[0]).toContain('reaches production');
  });

  it('honours an explicitly production-scoped waiver', () => {
    const prod = {
      vulnerabilities: {
        'brace-expansion': {
          severity: 'high',
          via: [advisory('https://github.com/advisories/GHSA-mh99-v99m-4gvg')],
        },
      },
    };
    const result = evaluateAudit({
      productionAudit: prod,
      fullAudit: prod,
      allowlist: waiver({ scope: 'production' }),
      today: TODAY,
    });
    expect(result.ok).toBe(true);
  });

  it('fails once a waiver expires, so a suppression cannot be forgotten', () => {
    const result = evaluateAudit({
      productionAudit: { vulnerabilities: {} },
      fullAudit: chainAudit(),
      allowlist: waiver({ expires: '2026-07-26' }),
      today: TODAY,
    });
    expect(result.ok).toBe(false);
    expect(result.expired).toEqual([{ advisory: 'GHSA-MH99-V99M-4GVG', expires: '2026-07-26' }]);
  });

  it('treats a missing or malformed expiry as expired', () => {
    expect(isFuture(undefined, TODAY)).toBe(false);
    expect(isFuture('soon', TODAY)).toBe(false);
    expect(isFuture('2026-07-27', TODAY)).toBe(false);
    expect(isFuture('2026-07-28', TODAY)).toBe(true);
  });

  it('blocks a finding whose advisory id cannot be resolved rather than waiving it blind', () => {
    const result = evaluateAudit({
      productionAudit: { vulnerabilities: {} },
      fullAudit: { vulnerabilities: { mystery: { severity: 'high', via: [] } } },
      allowlist: waiver(),
      today: TODAY,
    });
    expect(result.ok).toBe(false);
    expect(result.blocking[0].reasons[0]).toContain('no advisory id resolved');
  });

  it('reports a waiver whose finding is fixed as stale without failing the build', () => {
    const result = evaluateAudit({
      productionAudit: { vulnerabilities: {} },
      fullAudit: { vulnerabilities: {} },
      allowlist: waiver(),
      today: TODAY,
    });
    expect(result.ok).toBe(true);
    expect(result.stale).toEqual(['GHSA-MH99-V99M-4GVG']);
  });

  it('passes cleanly when nothing is vulnerable and nothing is waived', () => {
    const result = evaluateAudit({
      productionAudit: { vulnerabilities: {} },
      fullAudit: { vulnerabilities: {} },
      allowlist: { exceptions: [] },
      today: TODAY,
    });
    expect(result).toMatchObject({ ok: true, blocking: [], waived: [], expired: [], stale: [] });
  });
});
