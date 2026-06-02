'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const GH_TOKEN = process.env.GH_TOKEN;
const REPO = process.env.REPO;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'hello@blog.h0m3labs.store';
const ALERT_EMAIL = 'byosekumbuga@gmail.com';

// ─── Phase 1: Data collection ──────────────────────────────────────────────

function runNpmAudit() {
  try {
    const out = execSync('npm audit --json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(out);
  } catch (e) {
    // npm audit exits non-zero when vulns exist; stdout still contains JSON
    if (e.stdout) { try { return JSON.parse(e.stdout); } catch {} }
    console.warn('npm audit produced no parseable output');
    return null;
  }
}

function getInstalledDeps() {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return Object.keys(pkg.dependencies || {}).map(name => {
    try {
      const resolved = JSON.parse(
        fs.readFileSync(path.join('node_modules', name, 'package.json'), 'utf8')
      );
      return { name, version: resolved.version };
    } catch { return null; }
  }).filter(Boolean);
}

async function queryOSV(deps) {
  if (!deps.length) return [];
  const queries = deps.map(d => ({
    package: { name: d.name, ecosystem: 'npm' },
    version: d.version,
  }));
  try {
    const res = await fetch('https://api.osv.dev/v1/querybatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries }),
    });
    if (!res.ok) { console.warn(`OSV.dev ${res.status}`); return []; }
    const data = await res.json();
    const findings = [];
    (data.results || []).forEach((result, i) => {
      (result.vulns || []).forEach(vuln => {
        findings.push({
          package: deps[i].name,
          version: deps[i].version,
          id: vuln.id,
          summary: vuln.summary || '',
          severity: vuln.database_specific?.severity
            ?? (vuln.severity?.[0]?.score ? 'SEE_CVSS' : 'UNKNOWN'),
        });
      });
    });
    return findings;
  } catch (e) {
    console.warn('OSV.dev query failed:', e.message);
    return [];
  }
}

async function ghGet(endpoint) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function getGitHubStatus() {
  const [issues, pulls, runs] = await Promise.all([
    ghGet('/issues?state=open&labels=ai-code-quality&per_page=10'),
    ghGet('/pulls?state=open&per_page=10'),
    ghGet('/actions/runs?status=failure&per_page=10'),
  ]);
  return {
    openQualityIssues: (Array.isArray(issues) ? issues : [])
      .map(i => ({ number: i.number, title: i.title, url: i.html_url })),
    openPRs: (Array.isArray(pulls) ? pulls : [])
      .map(p => ({ number: p.number, title: p.title, user: p.user?.login, url: p.html_url })),
    recentFailures: (runs?.workflow_runs || []).slice(0, 5)
      .map(r => ({ workflow: r.name, conclusion: r.conclusion, url: r.html_url, createdAt: r.created_at })),
  };
}

// ─── Phase 2: Parse and dedup ─────────────────────────────────────────────

function parseNpmAudit(data) {
  if (!data?.vulnerabilities) return { findings: [], summary: {} };
  const findings = Object.values(data.vulnerabilities)
    .filter(v => ['critical', 'high', 'moderate'].includes(v.severity))
    .map(v => ({
      package: v.name,
      severity: v.severity.toUpperCase(),
      isDirect: v.isDirect,
      fixAvailable: !!v.fixAvailable,
      range: v.range || '',
    }));
  return { findings, summary: data.metadata?.vulnerabilities || {} };
}

// ─── Phase 3: Claude analysis ─────────────────────────────────────────────

async function analyzeWithClaude(npmFindings, osvFindings, githubStatus, exceptions) {
  const payload = { npmAudit: npmFindings, osvAdvisories: osvFindings, githubStatus };
  const exceptBlock = exceptions
    ? `\nKNOWN SAFE DESIGN DECISIONS — do not flag these:\n${exceptions}\n`
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
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `You are a senior security engineer reviewing a daily automated report for TaskPilot, a Next.js SaaS (stack: Next.js 14, Supabase, Stripe, Resend, Anthropic Claude). Analyze findings and produce a prioritized action list.
${exceptBlock}
DATA:
${JSON.stringify(payload, null, 2)}

For each real, actionable issue output one block:
SEVERITY: CRITICAL|HIGH|MEDIUM|LOW|INFO
CATEGORY: dependency-vuln|advisory|ci-failure|open-pr|code-quality
AREA: <package name or route>
FINDING: <one concise sentence>
ACTION: <exact command or step>
SOURCE: <CVE ID, GHSA ID, advisory URL, or "npm audit">

Sort by severity descending. Omit informational items for severity INFO unless count > 5.
If no real issues exist, respond with exactly: ALL CLEAR`,
      }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  return (await res.json()).content?.[0]?.text ?? '';
}

// ─── Phase 4: Report and notify ───────────────────────────────────────────

async function ensureLabel(name, color, description) {
  await fetch(`https://api.github.com/repos/${REPO}/labels`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, color, description }),
  });
  // Ignore errors (label may already exist)
}

async function hasOpenMonitorIssue() {
  const issues = await ghGet('/issues?state=open&labels=daily-monitor&per_page=5');
  return Array.isArray(issues) && issues.length > 0;
}

async function createIssue(analysis, summary) {
  const today = new Date().toISOString().slice(0, 10);
  const vulnLine = Object.entries(summary)
    .filter(([k]) => ['critical', 'high', 'moderate', 'low'].includes(k) && summary[k] > 0)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ') || 'none';

  const body = `## Daily Security & Quality Report — ${today}

**npm audit:** ${vulnLine || 'clean'}

### Findings

\`\`\`
${analysis}
\`\`\`

---
*Sources: [npm audit](https://docs.npmjs.com/cli/audit) · [OSV.dev](https://osv.dev) (Google Open Source Vulnerabilities) · GitHub Actions status*

### Implementing approved fixes
Open Claude Code and say: **"Implement the findings from this issue"**
For phone-based review: install [GitHub Mobile](https://github.com/mobile) and enable notifications.`;

  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `Daily Monitor: findings [${today}]`,
      body,
      labels: ['daily-monitor'],
    }),
  });
  if (!res.ok) throw new Error(`GitHub issue creation failed: ${res.status} ${await res.text()}`);
  return (await res.json()).html_url;
}

async function sendAlertEmail(analysis, issueUrl) {
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set — skipping email alert.');
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `TaskPilot Monitor <${RESEND_FROM}>`,
      to: [ALERT_EMAIL],
      subject: `[TaskPilot] HIGH/CRITICAL security findings — ${today}`,
      html: `<h2>TaskPilot Daily Security Monitor — ${today}</h2>
<p><strong>Action required:</strong> HIGH or CRITICAL findings detected. Review and implement approved fixes.</p>
<pre style="background:#f5f5f5;padding:16px;border-radius:6px;font-family:monospace;font-size:13px;white-space:pre-wrap">${analysis.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
<p><a href="${issueUrl}" style="color:#3ECF8E;font-weight:bold">View full report on GitHub →</a></p>
<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
<p style="color:#888;font-size:12px">To implement: open Claude Code and say "implement the findings from ${issueUrl}"<br>
To approve from phone: run <code>claude remote-control</code> in your terminal and scan the QR code from the Claude app.</p>`,
    }),
  });
  if (!res.ok) console.warn(`Email alert failed: ${res.status}`);
  else console.log(`Alert email sent to ${ALERT_EMAIL}`);
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  if (!GH_TOKEN || !REPO) { console.error('GH_TOKEN and REPO are required'); process.exit(1); }
  if (!ANTHROPIC_KEY) { console.warn('ANTHROPIC_API_KEY not set — skipping'); process.exit(0); }

  console.log(`Daily security monitor starting — ${new Date().toISOString()}`);

  if (await hasOpenMonitorIssue()) {
    console.log('Open daily-monitor issue already exists — skipping duplicate.');
    return;
  }

  // Ensure label exists (idempotent)
  await ensureLabel('daily-monitor', '0075ca', 'Automated daily security and quality report');

  // Collect data in parallel
  const [auditRaw, githubStatus] = await Promise.all([
    Promise.resolve(runNpmAudit()),
    getGitHubStatus(),
  ]);

  const prodDeps = getInstalledDeps();
  console.log(`Querying OSV.dev for ${prodDeps.length} production dependencies...`);
  const osvFindings = await queryOSV(prodDeps);

  const { findings: npmFindings, summary } = parseNpmAudit(auditRaw);

  // Deduplicate: OSV findings already reported by npm audit
  const npmPkgs = new Set(npmFindings.map(f => f.package));
  const uniqueOSV = osvFindings.filter(f => !npmPkgs.has(f.package));

  const hasAnything =
    npmFindings.length > 0 ||
    uniqueOSV.length > 0 ||
    githubStatus.openQualityIssues.length > 0 ||
    githubStatus.recentFailures.length > 0;

  if (!hasAnything) {
    console.log('No findings detected — all clear. No issue created.');
    return;
  }

  console.log(`Findings: ${npmFindings.length} npm vulns, ${uniqueOSV.length} OSV advisories, ` +
    `${githubStatus.openQualityIssues.length} open quality issues, ` +
    `${githubStatus.recentFailures.length} CI failures`);

  const exceptions = fs.existsSync('.github/audit-exceptions.md')
    ? fs.readFileSync('.github/audit-exceptions.md', 'utf8')
    : '';

  console.log('Analyzing with Claude Haiku...');
  const analysis = await analyzeWithClaude(npmFindings, uniqueOSV, githubStatus, exceptions);

  if (analysis.trim().startsWith('ALL CLEAR')) {
    console.log('Claude: all clear — no issue created.');
    return;
  }

  console.log('Creating GitHub issue...');
  const issueUrl = await createIssue(analysis, summary);
  console.log(`Issue created: ${issueUrl}`);

  const isHighSeverity = /\bCRITICAL\b|\bHIGH\b/.test(analysis);
  if (isHighSeverity) {
    console.log('HIGH/CRITICAL findings — sending email alert...');
    await sendAlertEmail(analysis, issueUrl);
  }

  console.log('Daily monitor complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
