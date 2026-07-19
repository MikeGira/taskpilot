import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Compensating control for the accepted risk that script-src still allows 'unsafe-inline'
// (see docs/COMPLIANCE.md §6 and .zap/rules.tsv rule 10055). unsafe-inline only becomes
// exploitable if the app hands attacker-controlled data to an HTML/JS execution sink. This
// test fails the build the moment such a sink is introduced, which is the event that would
// require reconsidering nonce-based CSP. As long as this stays green, unsafe-inline has no
// reachable sink and the risk acceptance holds.
//
// A genuinely needed sink can be allowlisted inline with a justification comment on the same
// or preceding line — e.g. `// csp-allow-sink: shiki output is library-sanitized HTML`. That
// keeps the exception visible in code review rather than letting someone silently delete this
// guard. Adding one is a signal to revisit the CSP decision in that PR.

const SRC = join(__dirname, '..', '..', 'src');
const ALLOW_MARKER = 'csp-allow-sink:';

const SINKS: { name: string; pattern: RegExp }[] = [
  { name: 'dangerouslySetInnerHTML', pattern: /dangerouslySetInnerHTML/ },
  { name: 'innerHTML assignment', pattern: /\.innerHTML\s*=/ },
  { name: 'outerHTML assignment', pattern: /\.outerHTML\s*=/ },
  { name: 'insertAdjacentHTML', pattern: /\.insertAdjacentHTML\s*\(/ },
  { name: 'document.write', pattern: /document\.write(?:ln)?\s*\(/ },
  { name: 'eval', pattern: /\beval\s*\(/ },
  { name: 'Function constructor', pattern: /\bnew\s+Function\s*\(/ },
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('no XSS execution sinks in src/ (CSP unsafe-inline compensating control)', () => {
  const files = walk(SRC);

  it('scans a non-trivial number of source files', () => {
    // Guards against the walker silently matching nothing and the test passing vacuously.
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(SINKS.map(s => [s.name, s.pattern] as const))(
    'contains no un-allowlisted %s sink',
    (name, pattern) => {
      const hits: string[] = [];
      for (const file of files) {
        const lines = readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, i) => {
          if (!pattern.test(line)) return;
          const prev = lines[i - 1] ?? '';
          if (line.includes(ALLOW_MARKER) || prev.includes(ALLOW_MARKER)) return;
          hits.push(`${relative(SRC, file)}:${i + 1}`);
        });
      }
      expect(hits, `Found ${name} sink(s) — reconsider CSP nonces or add an inline csp-allow-sink justification:\n${hits.join('\n')}`).toEqual([]);
    }
  );
});
