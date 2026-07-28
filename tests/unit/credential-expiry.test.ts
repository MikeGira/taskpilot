import { describe, it, expect } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { evaluateCredentials, renderReport, daysUntil, URGENT_DAYS, WARN_DAYS } = require('../../scripts/lib/credential-expiry');

const TODAY = '2026-07-28';
const cred = (name: string, expires: unknown) => ({ name, expires, usedBy: 'a workflow', renewal: 'make a new one' });
const manifestOf = (...creds: unknown[]) => ({ credentials: creds });

describe('daysUntil', () => {
  it('counts whole days forward and backward', () => {
    expect(daysUntil('2026-08-07', TODAY)).toBe(10);
    expect(daysUntil('2026-07-28', TODAY)).toBe(0);
    expect(daysUntil('2026-07-21', TODAY)).toBe(-7);
  });

  it('crosses month and year boundaries correctly', () => {
    expect(daysUntil('2027-07-28', TODAY)).toBe(365);
  });

  it('returns null for an unparseable date rather than guessing', () => {
    expect(daysUntil('next july', TODAY)).toBeNull();
    expect(daysUntil(undefined, TODAY)).toBeNull();
  });
});

describe('evaluateCredentials', () => {
  it('passes a credential comfortably in the future', () => {
    const result = evaluateCredentials(manifestOf(cred('AUTOFIX_PAT', '2027-07-28')), TODAY);
    expect(result.ok).toBe(true);
    expect(result.healthy).toHaveLength(1);
  });

  it('warns before the urgent window without failing', () => {
    const result = evaluateCredentials(manifestOf(cred('A', '2026-09-05')), TODAY); // 39 days
    expect(result.ok).toBe(true);
    expect(result.warn).toHaveLength(1);
    expect(result.warn[0].daysRemaining).toBeLessThanOrEqual(WARN_DAYS);
  });

  it('fails once inside the urgent window, since renewal is real work', () => {
    const result = evaluateCredentials(manifestOf(cred('A', '2026-08-05')), TODAY); // 8 days
    expect(result.ok).toBe(false);
    expect(result.urgent[0].daysRemaining).toBeLessThanOrEqual(URGENT_DAYS);
  });

  it('treats the expiry day itself as expired, not as one day left', () => {
    const result = evaluateCredentials(manifestOf(cred('A', TODAY)), TODAY);
    expect(result.ok).toBe(false);
    expect(result.expired).toHaveLength(1);
  });

  // A manifest that stopped parsing is a guard that stopped guarding.
  it('treats a missing or malformed date as expired rather than skipping it', () => {
    const result = evaluateCredentials(manifestOf(cred('A', 'soon'), cred('B', undefined)), TODAY);
    expect(result.ok).toBe(false);
    expect(result.expired).toHaveLength(2);
    expect(result.expired[0].daysRemaining).toBeNull();
  });

  it('orders the most urgent first', () => {
    const result = evaluateCredentials(manifestOf(cred('later', '2026-08-10'), cred('sooner', '2026-08-01')), TODAY);
    expect(result.urgent.map((c: { name: string }) => c.name)).toEqual(['sooner', 'later']);
  });

  it('handles an empty or absent manifest without throwing', () => {
    expect(evaluateCredentials({ credentials: [] }, TODAY).ok).toBe(true);
    expect(evaluateCredentials({}, TODAY).ok).toBe(true);
    expect(evaluateCredentials(null, TODAY).ok).toBe(true);
  });
});

describe('renderReport', () => {
  it('names the credential, the deadline and how to renew it', () => {
    const result = evaluateCredentials(manifestOf(cred('AUTOFIX_PAT', '2026-08-05')), TODAY);
    const report = renderReport(result, TODAY);
    expect(report).toContain('`AUTOFIX_PAT`');
    expect(report).toContain('8 day(s) left');
    expect(report).toContain('make a new one');
  });

  it('reports a rejected token as a present-tense outage', () => {
    const result = evaluateCredentials(manifestOf(cred('AUTOFIX_PAT', '2027-07-28')), TODAY);
    const report = renderReport(result, TODAY, [{ name: 'AUTOFIX_PAT', reason: 'rejected' }]);
    expect(report).toContain('Not authenticating now');
    expect(report).toContain('failing right now');
    expect(report).not.toContain('Secret not configured');
  });

  // These need different fixes; conflating them sends someone hunting the wrong fault.
  it('reports a never-configured secret separately from a rejected token', () => {
    const result = evaluateCredentials(manifestOf(cred('AUTOFIX_PAT', '2027-07-28')), TODAY);
    const report = renderReport(result, TODAY, [{ name: 'AUTOFIX_PAT', reason: 'missing' }]);
    expect(report).toContain('Secret not configured');
    expect(report).toContain('two separate steps');
    expect(report).not.toContain('rejected by the GitHub API');
  });

  it('always points at the fix that removes the annual renewal entirely', () => {
    const report = renderReport(evaluateCredentials(manifestOf(cred('A', '2026-08-01')), TODAY), TODAY);
    expect(report).toContain('GitHub App');
  });
});
