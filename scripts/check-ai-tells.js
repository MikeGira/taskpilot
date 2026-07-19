'use strict';
// Content lint: blocks AI-tell punctuation (em/en dashes) and canned LLM phrasing from
// user-facing text. Scans rendered pages/components (.tsx under src/app and src/components)
// and emails (.ts under src/emails). Skips code comments, the /api/ internal prompts, and
// lines marked `ai-tell-ok` (e.g. the runtime dash-stripping regex in chat-widget).
// Never blanket-replace dashes across code (a past sweep in another repo broke a calc()).
// Extend AI_PHRASES as new tells appear.
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const DASHES = /[—–]/; // em dash, en dash
const AI_PHRASES = [
  /\bas an ai\b/i,
  /in today's (fast-paced|digital|modern|ever-changing) world/i,
  /\bdelve into\b/i,
  /it's worth noting that/i,
  /\bunleash the power\b/i,
  /\ba testament to\b/i,
];

function isComment(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('{/*');
}

function collect(root, exts) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        if (name === 'api' || name === 'node_modules') continue;
        walk(full);
      } else if (exts.some((e) => name.endsWith(e))) {
        out.push(full);
      }
    }
  })(root);
  return out;
}

const files = [
  ...collect(path.join(SRC, 'app'), ['.tsx']),
  ...collect(path.join(SRC, 'components'), ['.tsx']),
  ...collect(path.join(SRC, 'emails'), ['.ts']),
];

const failures = [];
for (const file of files) {
  const rel = path.relative(ROOT, file);
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (isComment(line) || line.includes('ai-tell-ok')) return;
    if (DASHES.test(line)) failures.push(`${rel}:${i + 1}  em/en dash: ${line.trim().slice(0, 100)}`);
    for (const rx of AI_PHRASES) {
      if (rx.test(line)) failures.push(`${rel}:${i + 1}  AI phrase (${rx.source}): ${line.trim().slice(0, 100)}`);
    }
  });
}

if (failures.length) {
  console.error(`AI-tell check FAILED (${failures.length} occurrence(s)):\n`);
  for (const f of failures) console.error('  ' + f);
  console.error('\nReplace em/en dashes with commas, periods, parentheses, or hyphens. Remove canned LLM phrasing. Mark an intentional dash (e.g. a stripping regex) with a trailing `// ai-tell-ok`.');
  process.exit(1);
}
console.log(`AI-tell check passed: no em/en dashes or canned LLM phrasing in ${files.length} user-facing file(s).`);
