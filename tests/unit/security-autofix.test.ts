import { describe, it, expect } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { planRemediation, detectDowngrades, renderChangeTable, compareVersions, pickPatchedVersion } = require('../../scripts/lib/security-autofix');

const advisory = (url: string) => ({ source: 1, url, severity: 'high', title: 'x' });

const auditOf = (packages: Record<string, string>) => ({
  vulnerabilities: Object.fromEntries(
    Object.entries(packages).map(([name, url]) => [name, { severity: 'high', via: [advisory(url)] }]),
  ),
});

const SHARP = 'https://github.com/advisories/GHSA-f88m-g3jw-g9cj';
const BRACE = 'https://github.com/advisories/GHSA-mh99-v99m-4gvg';

describe('compareVersions', () => {
  it('orders versions numerically rather than lexically', () => {
    expect(compareVersions('15.5.9', '15.5.20')).toBeLessThan(0);
    expect(compareVersions('0.35.3', '0.34.5')).toBeGreaterThan(0);
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
  });

  it('ignores prerelease suffixes', () => {
    expect(compareVersions('16.0.0-beta.0', '16.0.0')).toBe(0);
  });
});

describe('pickPatchedVersion', () => {
  // The real shape of next's data on 2026-07-27: many advisories, several first-fix versions.
  // Picking the lowest would clear GHSA-26hh (15.5.18) and leave the eight July ones open.
  it('picks the highest in-major fix so co-occurring advisories are all cleared', () => {
    expect(pickPatchedVersion('15.5.16', ['15.5.18', '15.5.21', '15.5.16'])).toBe('15.5.21');
  });

  it('stays inside the installed major line rather than proposing a framework migration', () => {
    expect(pickPatchedVersion('15.5.20', ['15.5.21', '16.2.12'])).toBe('15.5.21');
  });

  it('escalates to a human when the only published fix crosses a major boundary', () => {
    expect(pickPatchedVersion('14.2.30', ['15.5.21', '16.2.12'])).toBeNull();
  });

  it('handles 0.x packages, where sharp lives', () => {
    expect(pickPatchedVersion('0.34.5', ['0.35.0'])).toBe('0.35.0');
  });

  it('never proposes a version at or below what is installed', () => {
    expect(pickPatchedVersion('8.5.23', ['8.5.18'])).toBeNull();
    expect(pickPatchedVersion('0.35.3', ['0.35.3'])).toBeNull();
  });

  it('returns null when the advisory API lists no patched version', () => {
    expect(pickPatchedVersion('1.0.0', [])).toBeNull();
    expect(pickPatchedVersion('1.0.0', undefined as unknown as string[])).toBeNull();
  });
});

describe('planRemediation', () => {
  const base = {
    patchedVersions: { sharp: '0.35.0' },
    directDependencies: { next: '^15.5.16' },
    existingOverrides: {},
  };

  it('plans an override for a transitive package a parent pins', () => {
    const audit = auditOf({ sharp: SHARP });
    const plan = planRemediation({ ...base, fullAudit: audit, productionAudit: audit });
    expect(plan.overrides).toEqual([{ package: 'sharp', version: '0.35.0', advisories: ['GHSA-F88M-G3JW-G9CJ'] }]);
    expect(plan.directBumps).toEqual([]);
  });

  it('plans a direct install for a declared dependency', () => {
    const audit = auditOf({ next: SHARP });
    const plan = planRemediation({ ...base, patchedVersions: { next: '15.5.22' }, fullAudit: audit, productionAudit: audit });
    expect(plan.directBumps).toEqual([{ package: 'next', version: '15.5.22', advisories: ['GHSA-F88M-G3JW-G9CJ'] }]);
    expect(plan.overrides).toEqual([]);
  });

  // A bot must not rewrite the dependency tree over a lint-toolchain advisory.
  it('defers development-only findings to the dated allowlist instead of fixing them', () => {
    const plan = planRemediation({
      ...base,
      fullAudit: auditOf({ 'brace-expansion': BRACE }),
      productionAudit: { vulnerabilities: {} },
    });
    expect(plan.deferred.map((d: { package: string }) => d.package)).toEqual(['brace-expansion']);
    expect(plan.overrides).toEqual([]);
    expect(plan.directBumps).toEqual([]);
  });

  it('reports a finding with no published fix as unfixable rather than guessing a version', () => {
    const audit = auditOf({ sharp: SHARP });
    const plan = planRemediation({ ...base, patchedVersions: {}, fullAudit: audit, productionAudit: audit });
    expect(plan.overrides).toEqual([]);
    expect(plan.unfixable[0].reason).toContain('no patched version published');
  });

  it('does not re-propose an override that is already pinned at or above the fix', () => {
    const audit = auditOf({ sharp: SHARP });
    const plan = planRemediation({ ...base, existingOverrides: { sharp: '^0.35.3' }, fullAudit: audit, productionAudit: audit });
    expect(plan.overrides).toEqual([]);
    expect(plan.unfixable[0].reason).toContain('already pins ^0.35.3');
  });
});

describe('detectDowngrades', () => {
  // The guard against `npm audit fix --force` proposing next 15.5.22 -> 14.2.35.
  it('flags a package that moved backwards', () => {
    expect(detectDowngrades({ next: '15.5.22' }, { next: '14.2.35' })).toEqual([
      { package: 'next', from: '15.5.22', to: '14.2.35' },
    ]);
  });

  it('accepts upgrades and unchanged packages', () => {
    expect(detectDowngrades({ next: '15.5.20', zod: '4.4.3' }, { next: '15.5.22', zod: '4.4.3' })).toEqual([]);
  });

  it('ignores packages that were removed from the tree', () => {
    expect(detectDowngrades({ gone: '2.0.0' }, {})).toEqual([]);
  });
});

describe('renderChangeTable', () => {
  it('renders only changed packages, with their advisories', () => {
    const table = renderChangeTable(
      { next: '15.5.20', zod: '4.4.3' },
      { next: '15.5.22', zod: '4.4.3' },
      { next: ['GHSA-P9J2-GV94-2WF4'] },
    );
    expect(table).toContain('| `next` | 15.5.20 | **15.5.22** | GHSA-P9J2-GV94-2WF4 |');
    expect(table).not.toContain('zod');
  });

  it('returns an empty string when nothing changed', () => {
    expect(renderChangeTable({ next: '15.5.22' }, { next: '15.5.22' })).toBe('');
  });
});
