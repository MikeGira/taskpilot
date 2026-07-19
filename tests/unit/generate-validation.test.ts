import { describe, it, expect } from 'vitest';
import { sanitizeFilename, validateGenerateResult } from '@/lib/generate-validation';

const ok = {
  needsClarification: false,
  question: null,
  script: 'Get-Service',
  filename: 'list-services.ps1',
  language: 'powershell',
  title: 'List services',
  explanation: 'Lists services.',
  configNotes: ['Needs PS 5.1'],
};

describe('sanitizeFilename', () => {
  it('keeps a sensible model-chosen name', () => {
    expect(sanitizeFilename('list-services.ps1', 'powershell')).toBe('list-services.ps1');
  });

  // The extension is derived from the validated language, never taken from the model.
  // An LLM-chosen ".exe"/".bat"/".hta" would otherwise be handed to a user as a download.
  it.each([
    ['payload.exe', 'powershell', 'payload.ps1'],
    ['setup.bat', 'bash', 'setup.sh'],
    ['thing.hta', 'python', 'thing.py'],
    ['script.ps1.exe', 'powershell', 'script.ps1.ps1'],
    ['main.tf.bat', 'terraform', 'main.tf.tf'],
  ])('rewrites %j (%s) to %j', (raw, language, expected) => {
    expect(sanitizeFilename(raw, language as never)).toBe(expected);
  });

  it('strips path components of either flavour', () => {
    expect(sanitizeFilename('../../etc/passwd.ps1', 'powershell')).toBe('passwd.ps1');
    expect(sanitizeFilename('..\\..\\windows\\system32\\evil.ps1', 'powershell')).toBe('evil.ps1');
    expect(sanitizeFilename('/absolute/path/x.sh', 'bash')).toBe('x.sh');
  });

  it('refuses to produce a hidden file or an empty name', () => {
    expect(sanitizeFilename('.bashrc', 'bash')).toBe('script.sh');
    expect(sanitizeFilename('', 'bash')).toBe('script.sh');
    expect(sanitizeFilename(null, 'bash')).toBe('script.sh');
    expect(sanitizeFilename('...', 'bash')).toBe('script.sh');
  });

  it('replaces characters outside the allowed set', () => {
    expect(sanitizeFilename('my script (v2)!.ps1', 'powershell')).toBe('my-script-v2.ps1');
    // Hyphen is in the allowed set, so " -" collapses to "--" rather than "-". Cosmetic;
    // what matters is that ';' and ' ' cannot survive into the name.
    expect(sanitizeFilename('a;rm -rf b.sh', 'bash')).toBe('a-rm--rf-b.sh');
  });

  it('caps the stem length', () => {
    const out = sanitizeFilename(`${'a'.repeat(300)}.ps1`, 'powershell');
    expect(out.length).toBeLessThanOrEqual(68);
    expect(out.endsWith('.ps1')).toBe(true);
  });

  it('names Dockerfiles by convention', () => {
    expect(sanitizeFilename('anything.txt', 'dockerfile')).toBe('Dockerfile');
  });

  it('falls back to .txt when the language is unknown', () => {
    expect(sanitizeFilename('thing.weird', null)).toBe('thing.txt');
  });
});

describe('validateGenerateResult', () => {
  it('accepts a well-formed result', () => {
    const r = validateGenerateResult(ok);
    expect(r).not.toBeNull();
    expect(r!.script).toBe('Get-Service');
    expect(r!.filename).toBe('list-services.ps1');
    expect(r!.language).toBe('powershell');
  });

  it('accepts a clarification result', () => {
    const r = validateGenerateResult({ ...ok, needsClarification: true, question: 'Which OU?', script: null });
    expect(r).not.toBeNull();
    expect(r!.question).toBe('Which OU?');
  });

  it('degrades an unknown language to null instead of failing the generation', () => {
    const r = validateGenerateResult({ ...ok, language: 'brainfuck' });
    expect(r).not.toBeNull();
    expect(r!.language).toBeNull();
    // and the extension follows the validated language, not the model's claim
    expect(r!.filename).toBe('list-services.txt');
  });

  it('rejects a result that is neither a script nor a question', () => {
    expect(validateGenerateResult({ ...ok, script: null })).toBeNull();
    expect(validateGenerateResult({ ...ok, script: '' })).toBeNull();
  });

  it('rejects a clarification with no question', () => {
    expect(validateGenerateResult({ ...ok, needsClarification: true, question: null, script: null })).toBeNull();
  });

  it.each([null, undefined, 'a string', 42, [], { unrelated: true }])(
    'rejects non-conforming payload %j',
    (bad) => {
      expect(validateGenerateResult(bad)).toBeNull();
    }
  );

  it('drops unknown extra fields rather than passing them through', () => {
    const r = validateGenerateResult({ ...ok, evil: '<script>alert(1)</script>' });
    expect(r).not.toBeNull();
    expect(r as Record<string, unknown>).not.toHaveProperty('evil');
  });

  it('rejects an over-long script rather than streaming it to the browser', () => {
    expect(validateGenerateResult({ ...ok, script: 'x'.repeat(500_001) })).toBeNull();
  });

  it('caps configNotes and normalizes a missing value to null', () => {
    expect(validateGenerateResult({ ...ok, configNotes: undefined })!.configNotes).toBeNull();
    expect(validateGenerateResult({ ...ok, configNotes: Array(51).fill('x') })).toBeNull();
  });

  it('normalizes empty strings to null', () => {
    const r = validateGenerateResult({ ...ok, title: '   ', explanation: '' });
    expect(r!.title).toBeNull();
    expect(r!.explanation).toBeNull();
  });
});
