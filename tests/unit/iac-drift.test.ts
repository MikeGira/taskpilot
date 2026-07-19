import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// The drift logic is shared, side-effect-free CJS so both the workflow script and this test use
// the identical decision path — the parse/compare fix cannot drift between them.
import { parseManifest, computeDrift } from '../../scripts/lib/iac-drift.js';

const MANIFEST_SRC = readFileSync(
  join(__dirname, '..', '..', 'src', 'lib', 'iac-allowlists.ts'),
  'utf8',
);

describe('parseManifest', () => {
  it('extracts LAST_VERIFIED, provider majors, and AWS regions from the real manifest', () => {
    const parsed = parseManifest(MANIFEST_SRC);
    expect(parsed.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parsed.providers.aws).toBeGreaterThan(0);
    expect(parsed.providers.azurerm).toBeGreaterThan(0);
    expect(parsed.providers.google).toBeGreaterThan(0);
    expect(parsed.awsRegions).toContain('us-east-1');
    expect(parsed.awsRegions.length).toBeGreaterThan(20);
  });

  it('is resilient to empty or null input', () => {
    expect(parseManifest('')).toEqual({ lastVerified: null, providers: {}, awsRegions: [] });
    // @ts-expect-error exercising the null guard
    expect(parseManifest(null)).toEqual({ lastVerified: null, providers: {}, awsRegions: [] });
  });
});

describe('computeDrift', () => {
  const manifest = { providers: { aws: 6, azurerm: 4, google: 7 }, awsRegions: ['us-east-1', 'eu-west-2'] };

  it('reports no drift when live matches the manifest', () => {
    const result = computeDrift(manifest, {
      liveProviderMajors: { aws: 6, azurerm: 4, google: 7 },
      liveAwsRegions: ['us-east-1', 'eu-west-2'],
    });
    expect(result.hasDrift).toBe(false);
    expect(result.lines).toEqual([]);
  });

  it('flags a provider whose live major is ahead of the manifest', () => {
    const result = computeDrift(manifest, {
      liveProviderMajors: { aws: 7, azurerm: 4, google: 7 },
      liveAwsRegions: ['us-east-1', 'eu-west-2'],
    });
    expect(result.hasDrift).toBe(true);
    expect(result.lines.some(l => l.includes('aws') && l.includes('7'))).toBe(true);
  });

  it('does not flag a provider whose live major is behind or equal', () => {
    const result = computeDrift(manifest, {
      liveProviderMajors: { aws: 5 },
      liveAwsRegions: ['us-east-1', 'eu-west-2'],
    });
    expect(result.hasDrift).toBe(false);
  });

  it('flags a new live region missing from the manifest', () => {
    const result = computeDrift(manifest, {
      liveProviderMajors: {},
      liveAwsRegions: ['us-east-1', 'eu-west-2', 'ap-southeast-9'],
    });
    expect(result.hasDrift).toBe(true);
    expect(result.lines.some(l => l.includes('ap-southeast-9'))).toBe(true);
  });

  it('ignores manifest regions that are absent from a partial live source', () => {
    const result = computeDrift(manifest, { liveProviderMajors: {}, liveAwsRegions: ['us-east-1'] });
    expect(result.hasDrift).toBe(false);
  });

  it('deduplicates and sorts new regions', () => {
    const result = computeDrift(manifest, {
      liveProviderMajors: {},
      liveAwsRegions: ['zz-b-2', 'zz-a-1', 'zz-b-2'],
    });
    const line = result.lines.find(l => l.includes('zz-'))!;
    expect(line.indexOf('zz-a-1')).toBeLessThan(line.indexOf('zz-b-2'));
    expect(line.match(/zz-b-2/g)).toHaveLength(1);
  });

  it('tolerates missing fields on both arguments', () => {
    expect(computeDrift({} as never, {} as never)).toEqual({ hasDrift: false, lines: [] });
    expect(computeDrift(undefined as never, undefined as never)).toEqual({ hasDrift: false, lines: [] });
  });
});
