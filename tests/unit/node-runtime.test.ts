import { describe, it, expect } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  parseEnginesNode,
  checkMajor,
  findHardcodedVersions,
  evaluateNodeRuntime,
} = require('../../scripts/lib/node-runtime');

const TODAY = '2026-08-16';
const wf = (path: string, content: string) => ({ path, content });
const deferring = [wf('.github/workflows/ci.yml', "        node-version-file: 'package.json'\n")];

describe('parseEnginesNode', () => {
  it('accepts the pinned-major forms Vercel documents', () => {
    expect(parseEnginesNode('24.x')).toEqual({ major: 24 });
    expect(parseEnginesNode('^24.0.0')).toEqual({ major: 24 });
    expect(parseEnginesNode('  22.x  ')).toEqual({ major: 22 });
  });

  it('rejects an open range, which deploys a different major than it reads as', () => {
    expect(parseEnginesNode('>=20.0.0')).toHaveProperty('error');
    expect(parseEnginesNode('*')).toHaveProperty('error');
  });

  it('rejects a missing declaration rather than defaulting', () => {
    expect(parseEnginesNode(undefined)).toHaveProperty('error');
    expect(parseEnginesNode('')).toHaveProperty('error');
  });
});

describe('checkMajor', () => {
  it('blocks Node 20 — EOL upstream and dropped by Vercel on 2026-10-01', () => {
    const v = checkMajor(20, TODAY);
    expect(v.level).toBe('error');
    expect(v.message).toContain('end-of-life');
  });

  it('warns on a maintenance-only major without blocking the build', () => {
    const v = checkMajor(22, TODAY);
    expect(v.level).toBe('warn');
    expect(v.message).toContain('maintenance');
  });

  it('passes the current Active LTS', () => {
    expect(checkMajor(24, TODAY).level).toBe('ok');
  });

  it('warns once Node 24 itself enters maintenance, with no code change', () => {
    expect(checkMajor(24, '2026-10-21').level).toBe('warn');
  });

  it('fails closed on a major it has never heard of', () => {
    const v = checkMajor(26, TODAY);
    expect(v.level).toBe('error');
    expect(v.message).toContain('not in this gate');
  });
});

describe('findHardcodedVersions', () => {
  it('flags a re-hardcoded pin, which is how the versions drifted apart originally', () => {
    const found = findHardcodedVersions([
      wf('.github/workflows/a.yml', "jobs:\n      - uses: setup-node\n        node-version: '22'\n"),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ path: '.github/workflows/a.yml', line: 3 });
  });

  it('accepts the pointer form and ignores the word in prose', () => {
    expect(findHardcodedVersions(deferring)).toHaveLength(0);
    expect(findHardcodedVersions([wf('a.yml', '# node-version: 22 was hardcoded here\n')])).toHaveLength(0);
  });
});

describe('evaluateNodeRuntime', () => {
  it('passes the intended configuration', () => {
    const r = evaluateNodeRuntime({ enginesNode: '24.x', workflows: deferring, today: TODAY });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.major).toBe(24);
  });

  it('reproduces the BridgeUp defect: Node 20 pinned in engines', () => {
    const r = evaluateNodeRuntime({ enginesNode: '20.x', workflows: deferring, today: TODAY });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/end-of-life/);
  });

  it('reports a supported major that a workflow has drifted away from', () => {
    const r = evaluateNodeRuntime({
      enginesNode: '24.x',
      workflows: [wf('.github/workflows/ci.yml', "        node-version: '22'\n")],
      today: TODAY,
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('ci.yml:1');
  });

  it('lets a maintenance-major warning through without failing the build', () => {
    const r = evaluateNodeRuntime({ enginesNode: '22.x', workflows: deferring, today: TODAY });
    expect(r.ok).toBe(true);
    expect(r.warnings).toHaveLength(1);
  });
});
