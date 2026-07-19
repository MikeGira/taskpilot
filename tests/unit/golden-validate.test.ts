import { describe, it, expect } from 'vitest';
import {
  validatorFor,
  interpretShellcheck,
  interpretPSScriptAnalyzer,
  VALIDATORS,
} from '../../scripts/lib/golden-validate.js';

describe('validatorFor', () => {
  it('maps each supported language to a validator', () => {
    expect(validatorFor('bash').tool).toBe('shellcheck');
    expect(validatorFor('python').tool).toBe('py_compile');
    expect(validatorFor('powershell').tool).toBe('PSScriptAnalyzer');
    expect(validatorFor('terraform').tool).toBe('terraform validate');
    for (const lang of ['bash', 'python', 'powershell', 'terraform']) {
      expect(validatorFor(lang).available).toBe(true);
      expect(validatorFor(lang).ext).toMatch(/^\./);
    }
  });

  it('returns an unavailable descriptor for an unsupported language', () => {
    const v = validatorFor('yaml');
    expect(v.available).toBe(false);
    expect(v.tool).toBe('none');
  });

  it('exposes the validator table', () => {
    expect(Object.keys(VALIDATORS)).toEqual(['bash', 'python', 'powershell', 'terraform']);
  });
});

describe('interpretShellcheck', () => {
  it('passes clean output', () => {
    expect(interpretShellcheck('[]')).toEqual({ ok: true, errors: [] });
  });

  it('fails on an error-level comment but ignores warnings/info', () => {
    const json = JSON.stringify([
      { level: 'warning', code: 2086, line: 3, message: 'Double quote to prevent globbing' },
      { level: 'error', code: 1073, line: 7, message: "Couldn't parse this if expression" },
      { level: 'info', code: 2250, line: 9, message: 'style' },
    ]);
    const r = interpretShellcheck(json);
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('SC1073');
  });

  it('does not fail on warnings alone', () => {
    const json = JSON.stringify([{ level: 'warning', code: 2086, line: 3, message: 'x' }]);
    expect(interpretShellcheck(json).ok).toBe(true);
  });

  it('treats unparseable output as a pass (no false regression)', () => {
    expect(interpretShellcheck('not json')).toEqual({ ok: true, errors: [] });
    expect(interpretShellcheck('')).toEqual({ ok: true, errors: [] });
  });
});

describe('interpretPSScriptAnalyzer', () => {
  it('passes clean output', () => {
    expect(interpretPSScriptAnalyzer('[]')).toEqual({ ok: true, errors: [] });
  });

  it('fails on Error (2) and ParseError (3) severities, ignores Warning (1)', () => {
    const json = JSON.stringify([
      { Severity: 1, RuleName: 'PSAvoidUsingWriteHost', Line: 2, Message: 'warn' },
      { Severity: 2, RuleName: 'PSUseDeclaredVarsMoreThanAssignments', Line: 5, Message: 'err' },
      { Severity: 3, RuleName: 'ParseError', Line: 9, Message: 'unterminated string' },
    ]);
    const r = interpretPSScriptAnalyzer(json);
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(2);
  });

  it('accepts string severities too', () => {
    const json = JSON.stringify([{ Severity: 'ParseError', RuleName: 'X', Line: 1, Message: 'm' }]);
    expect(interpretPSScriptAnalyzer(json).ok).toBe(false);
  });

  it('handles a single object (ConvertTo-Json collapses one record)', () => {
    const json = JSON.stringify({ Severity: 2, RuleName: 'X', Line: 1, Message: 'm' });
    expect(interpretPSScriptAnalyzer(json).ok).toBe(false);
  });

  it('treats unparseable output as a pass', () => {
    expect(interpretPSScriptAnalyzer('undefined')).toEqual({ ok: true, errors: [] });
    expect(interpretPSScriptAnalyzer('')).toEqual({ ok: true, errors: [] });
  });
});
