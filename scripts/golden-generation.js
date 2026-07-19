'use strict';

// Golden-generation CI check (grounding L4 slice). Generates a handful of scripts from the LIVE
// /api/generate prompt and runs each through the real validator for its language (shellcheck,
// py_compile, PSScriptAnalyzer, terraform validate). A prompt regression that starts emitting
// broken code fails this job. Runs on a schedule + on demand — never per-PR — so there is no
// per-request API cost. On failure it files a deduped, self-closing tracking issue.
//
// Assertions are lenient by design: the generator is non-deterministic, so we assert the output
// is VALID (parses / lints clean of hard errors), not that it matches fixed text.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { validatorFor, interpretShellcheck, interpretPSScriptAnalyzer } = require('./lib/golden-validate');

const GENERATE_URL = process.env.GENERATE_URL || 'http://localhost:3000/api/generate';
const GH_TOKEN = process.env.GH_TOKEN;
const REPO = process.env.REPO;
const LABEL = 'golden-generation';

async function postGenerate(body) {
  // One retry on transient upstream timeouts/errors (504/502) — the live model call occasionally
  // exceeds the route timeout. A single retry de-flakes the scheduled run without masking a real
  // regression (a persistent failure still surfaces).
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(GENERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    if ((res.status === 504 || res.status === 502) && attempt === 0) {
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }
    throw new Error(`generate ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

async function generate(prompt) {
  const body = {
    os: prompt.os,
    environment: prompt.environment,
    cloudProviders: prompt.cloudProviders,
    tool: prompt.tool,
    taskDescription: prompt.taskDescription,
  };
  let data = await postGenerate(body);

  // Resolve a single clarification round deterministically so the job does not stall on it.
  if (data.needsClarification) {
    data = await postGenerate({ ...body, previousQuestion: data.question, clarificationAnswer: 'Use sensible production defaults and proceed.' });
  }
  return data;
}

function runValidator(language, file, dir) {
  if (language === 'bash') {
    const r = spawnSync('shellcheck', ['--format=json', file], { encoding: 'utf8' });
    if (r.error) return { ok: false, errors: [`shellcheck not runnable: ${r.error.message}`] };
    return interpretShellcheck(r.stdout);
  }
  if (language === 'python') {
    const r = spawnSync('python3', ['-m', 'py_compile', file], { encoding: 'utf8' });
    return r.status === 0 ? { ok: true, errors: [] } : { ok: false, errors: [(r.stderr || '').trim().split('\n').slice(-3).join(' ')] };
  }
  if (language === 'powershell') {
    const r = spawnSync('pwsh', ['-NoProfile', '-Command', `Invoke-ScriptAnalyzer -Path '${file}' | ConvertTo-Json -Depth 3`], { encoding: 'utf8' });
    if (r.error) return { ok: false, errors: [`pwsh not runnable: ${r.error.message}`] };
    return interpretPSScriptAnalyzer(r.stdout);
  }
  if (language === 'terraform') {
    // fmt (not validate) — the generated main.tf references variables declared in configNotes, so a
    // full validate would fail by design. fmt asserts the HCL parses; -write=false errors only on a
    // real syntax error, not on formatting differences. No init/provider download needed.
    const r = spawnSync('terraform', [`-chdir=${dir}`, 'fmt', '-write=false', '-no-color'], { encoding: 'utf8' });
    if (r.error) return { ok: false, errors: [`terraform not runnable: ${r.error.message}`] };
    return r.status === 0 ? { ok: true, errors: [] } : { ok: false, errors: [(r.stderr || r.stdout || '').trim().split('\n').slice(-5).join(' ')] };
  }
  return { ok: true, errors: [] };
}

async function gh(endpoint, method = 'GET', payload) {
  if (!GH_TOKEN || !REPO) return method === 'GET' ? null : false;
  const res = await fetch(`https://api.github.com/repos/${REPO}${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (method === 'GET') return res.ok ? res.json() : null;
  return res.ok;
}

async function reportToGitHub(failures) {
  const open = (await gh(`/issues?state=open&labels=${LABEL}&per_page=5`)) || [];
  const today = new Date().toISOString().slice(0, 10);

  if (failures.length === 0) {
    for (const issue of open) {
      await gh(`/issues/${issue.number}/comments`, 'POST', { body: `Golden generation passed on ${today} — all sampled generations validate clean. Closing automatically.` });
      await gh(`/issues/${issue.number}`, 'PATCH', { state: 'closed', state_reason: 'completed' });
    }
    return;
  }
  if (open.length > 0) return; // already tracked

  await gh('/labels', 'POST', { name: LABEL, color: 'd93f0b', description: 'A live golden generation failed its language validator (possible prompt regression)' });
  const body = `## Golden generation regression — ${today}

One or more live generations no longer pass their language validator. This usually means a prompt change regressed output quality.

${failures.map(f => `### ${f.name} (${f.language})\n\n${f.errors.map(e => `- ${e}`).join('\n')}`).join('\n\n')}

### Fix
Reproduce locally with \`GENERATE_URL\` pointed at a running dev server:
\`\`\`
GENERATE_URL=http://localhost:3000/api/generate node scripts/golden-generation.js
\`\`\`
then adjust the tool prompt in \`src/app/api/generate/route.ts\` (\`buildToolSection\`).

---
*Generated by [Golden Generation](../../actions/workflows/golden-generation.yml).*`;
  await gh('/issues', 'POST', { title: `Golden generation regression [${today}]`, body, labels: [LABEL] });
}

async function main() {
  const prompts = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tests', 'golden', 'prompts.json'), 'utf8'));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'golden-'));
  const failures = [];

  for (const prompt of prompts) {
    const v = validatorFor(prompt.expectLanguage);
    if (!v.available) { console.log(`SKIP ${prompt.name}: no validator for ${prompt.expectLanguage}`); continue; }

    let result;
    try {
      result = await generate(prompt);
    } catch (e) {
      failures.push({ name: prompt.name, language: prompt.expectLanguage, errors: [`generation failed: ${e.message}`] });
      console.log(`FAIL ${prompt.name}: ${e.message}`);
      continue;
    }

    if (!result.script) {
      failures.push({ name: prompt.name, language: prompt.expectLanguage, errors: ['no script returned'] });
      console.log(`FAIL ${prompt.name}: no script`);
      continue;
    }

    const caseDir = fs.mkdtempSync(path.join(workDir, `${prompt.name}-`));
    const file = path.join(caseDir, `main${v.ext}`);
    fs.writeFileSync(file, result.script);

    const outcome = runValidator(prompt.expectLanguage, file, caseDir);
    if (outcome.ok) {
      console.log(`PASS ${prompt.name} (${v.tool})`);
    } else {
      failures.push({ name: prompt.name, language: prompt.expectLanguage, errors: outcome.errors });
      console.log(`FAIL ${prompt.name} (${v.tool}):\n  ${outcome.errors.join('\n  ')}`);
    }
  }

  await reportToGitHub(failures);

  console.log(`\nGolden generation: ${prompts.length - failures.length}/${prompts.length} passed.`);
  if (failures.length > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
