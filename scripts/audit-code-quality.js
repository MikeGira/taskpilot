const fs = require('fs');
const path = require('path');

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const GH_TOKEN = process.env.GH_TOKEN;
const REPO = process.env.REPO;
const PR_NUMBER = process.env.PR_NUMBER || '';
const EVENT_NAME = process.env.EVENT_NAME || 'push';

if (!GH_TOKEN) { console.error('Missing GH_TOKEN'); process.exit(1); }
if (!REPO) { console.error('Missing REPO'); process.exit(1); }
if (!ANTHROPIC_KEY) {
  console.warn('ANTHROPIC_API_KEY not set — skipping quality audit.');
  process.exit(0);
}

// Security-critical routes get reviewed every run
const PRIORITY_FILES = [
  'src/app/api/checkout/route.ts',
  'src/app/api/webhook/stripe/route.ts',
  'src/app/api/generate/route.ts',
  'src/app/api/workflow/generate/route.ts',
  'src/app/api/assistant/route.ts',
  'src/app/api/account/delete/route.ts',
];

function readFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

function readExceptions() {
  return readFile('.github/audit-exceptions.md');
}

function prepareContent(filePath) {
  const raw = readFile(filePath);
  if (!raw) return null;
  // Strip large string literals (system prompts, long templates) to keep token cost low
  const stripped = raw.replace(/`[\s\S]{400,}?`/g, '`/* ...long string omitted... */`');
  const lines = stripped.split('\n');
  // For large files always show both the top (imports/schemas) AND the bottom
  // (request handlers). A hard head-only truncation causes false positives because
  // Next.js POST handlers appear at the end of route files, not the beginning.
  if (lines.length <= 300) return lines.join('\n');
  const head = lines.slice(0, 150);
  const tail = lines.slice(-150);
  return [...head, '', '/* ...middle section omitted for brevity... */', '', ...tail].join('\n');
}

async function callClaude(bundle) {
  const exceptions = readExceptions();
  const exceptionsBlock = exceptions
    ? `\nKNOWN DESIGN DECISIONS — do not flag anything listed here:\n${exceptions}\n`
    : '';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a senior engineer reviewing production Next.js API route handlers (TypeScript).
${exceptionsBlock}
Identify ONLY real, actionable issues in these categories:
- SIMPLIFICATION: Code more complex than needed (multiple lines reducible to fewer, roundabout logic)
- SECURITY: Missing input validation, unsafe patterns, missing auth checks, Stripe webhook verification gaps
- DUPLICATION: Repeated logic that should be consolidated into a shared helper

Do NOT report: style preferences, missing docs, or theoretical issues with no practical exploit path.
Do NOT report any issue that matches a known design decision listed above.
IMPORTANT — the code below was pre-processed by the audit pipeline to reduce tokens: long string literals were replaced with \`/* ...long string omitted... */\` and large files have a \`/* ...middle section omitted for brevity... */\` gap. These markers do NOT exist in the real source — never flag them as corrupted code, malformed template strings, or incomplete syntax.

FILES UNDER REVIEW:
${bundle}

Format each finding as:
**[CATEGORY] \`filename\` — Issue title**
One-sentence description + suggested fix.

If no real issues found, respond with exactly the word PASS and nothing else — no summary, no explanation, no list of what you checked.`,
      }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  return (await res.json()).content?.[0]?.text ?? '';
}

async function getOpenIssues() {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/issues?labels=ai-code-quality&state=open`,
    { headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json' } }
  );
  if (!res.ok) return [];
  const issues = await res.json();
  return Array.isArray(issues) ? issues : [];
}

async function closeIssue(number) {
  await fetch(`https://api.github.com/repos/${REPO}/issues/${number}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'closed', state_reason: 'completed' }),
  });
  console.log(`Closed resolved quality issue #${number}`);
}

async function createIssue(findings, reviewedFiles) {
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `Code Quality Audit: issues found [${today}]`,
      body: `## TaskPilot Code Quality Audit — ${today}\n\n${findings}\n\n**Files reviewed:** ${reviewedFiles.join(', ')}\n\n### Next Steps\n1. Review each finding above\n2. Apply the fix or close as won't-fix with a comment\n3. Close this issue once addressed\n\n---\n*Generated by the automated [Code Quality Audit](../../actions/workflows/ai-audit.yml) workflow.*`,
      labels: ['ai-code-quality'],
    }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  const issue = await res.json();
  console.log(`Issue created: ${issue.html_url}`);
}

async function postPRComment(findings) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/issues/${PR_NUMBER}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      body: `## AI Code Quality Review\n\n${findings}\n\n---\n*Automated review by Claude Haiku — [workflow](../../actions/workflows/ai-audit.yml)*`,
    }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  const comment = await res.json();
  console.log(`PR comment posted: ${comment.html_url}`);
}

async function main() {
  const existing = PRIORITY_FILES.filter(f => fs.existsSync(f));

  if (!existing.length) {
    console.error('No priority API route files found — check paths.');
    process.exit(1);
  }

  const bundle = existing
    .map(f => {
      const content = prepareContent(f);
      return content ? `### ${path.basename(path.dirname(f))}/route.ts\n\`\`\`typescript\n${content}\n\`\`\`` : null;
    })
    .filter(Boolean)
    .join('\n\n');

  console.log(`Auditing ${existing.length} API route files for code quality...`);
  const result = await callClaude(bundle);
  console.log('Result:', result.slice(0, 200));

  const openIssues = await getOpenIssues();

  // PASS detection keys off the REQUIRED finding format, not the literal word "PASS".
  // A real finding must be formatted `**[CATEGORY] ...**` with CATEGORY in
  // {SIMPLIFICATION, SECURITY, DUPLICATION}. So "no category marker present" is the
  // reliable no-findings signal. The model sometimes answers "PASS" and then keeps
  // explaining ("PASS\n\nI reviewed all six handlers…"), which the old first/last-line
  // check misread as findings and filed as a noise issue (#74). Absence of a marker is
  // robust to that prose. (Belt-and-suspenders: an explicit bare "PASS" also counts.)
  const stripped = result.replace(/[*_`~]/g, '').trim();
  const hasFindingMarker = /\[\s*(SIMPLIFICATION|SECURITY|DUPLICATION)\s*\]/i.test(stripped);
  const isPASS = stripped === 'PASS' || !hasFindingMarker;
  if (isPASS) {
    console.log('Quality audit passed — no issues found.');
    for (const issue of openIssues) await closeIssue(issue.number);
    return;
  }

  if (EVENT_NAME === 'pull_request' && PR_NUMBER) {
    await postPRComment(result);
  } else {
    if (openIssues.length > 0) {
      console.log(`Open ai-code-quality issue already exists (#${openIssues[0].number}) — skipping duplicate.`);
      return;
    }
    await createIssue(result, existing);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
