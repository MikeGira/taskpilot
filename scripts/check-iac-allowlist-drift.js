'use strict';

// Quarterly IaC-allowlist drift check (grounding L1 staleness control). Fetches live provider
// data from public, credential-free sources and compares it to the manifest in
// src/lib/iac-allowlists.ts. On drift it opens ONE deduped tracking issue; when a prior run's
// drift is resolved it auto-closes the issue. Advisory only — never fails a build.
//
// Live-checked (credential-free): Terraform provider majors (registry.terraform.io) and AWS
// regions (ip-ranges.amazonaws.com). GCP/Azure regions and instance families are NOT live-checked
// here (they need auth or have no stable public catalogue); they are kept current by the dated
// snapshot and manual review — documented in docs/COMPLIANCE.md §6.

const fs = require('fs');
const path = require('path');
const { parseManifest, computeDrift } = require('./lib/iac-drift');

const GH_TOKEN = process.env.GH_TOKEN;
const REPO = process.env.REPO;
const LABEL = 'iac-allowlist-drift';

// Terraform registry source addresses for the providers the manifest grounds.
const TF_PROVIDERS = { aws: 'hashicorp/aws', azurerm: 'hashicorp/azurerm', google: 'hashicorp/google' };

function majorOf(version) {
  const m = String(version).match(/^\s*v?(\d+)/);
  return m ? Number(m[1]) : null;
}

async function fetchProviderMajors() {
  const out = {};
  for (const [name, source] of Object.entries(TF_PROVIDERS)) {
    try {
      const res = await fetch(`https://registry.terraform.io/v1/providers/${source}`);
      if (!res.ok) { console.warn(`Terraform registry ${name}: ${res.status}`); continue; }
      const data = await res.json();
      const major = majorOf(data.version);
      if (major != null) out[name] = major;
    } catch (e) {
      console.warn(`Terraform registry ${name} fetch failed: ${e.message}`);
    }
  }
  return out;
}

async function fetchAwsRegions() {
  try {
    const res = await fetch('https://ip-ranges.amazonaws.com/ip-ranges.json');
    if (!res.ok) { console.warn(`AWS ip-ranges: ${res.status}`); return []; }
    const data = await res.json();
    const regions = new Set();
    for (const p of data.prefixes || []) {
      if (p.region && /^[a-z]{2}-/.test(p.region)) regions.add(p.region);
    }
    return [...regions];
  } catch (e) {
    console.warn(`AWS ip-ranges fetch failed: ${e.message}`);
    return [];
  }
}

async function gh(endpoint, method = 'GET', payload) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (method === 'GET') return res.ok ? res.json() : null;
  return res.ok;
}

async function ensureLabel() {
  await gh('/labels', 'POST', { name: LABEL, color: 'fbca04', description: 'IaC allowlist has drifted from live provider catalogues' });
}

async function getOpenDriftIssues() {
  const issues = await gh(`/issues?state=open&labels=${LABEL}&per_page=5`);
  return Array.isArray(issues) ? issues : [];
}

async function main() {
  if (!GH_TOKEN || !REPO) { console.error('GH_TOKEN and REPO are required'); process.exit(1); }

  const tsSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'iac-allowlists.ts'), 'utf8');
  const manifest = parseManifest(tsSource);
  console.log(`Manifest last verified ${manifest.lastVerified}; ${manifest.awsRegions.length} AWS regions, providers: ${Object.keys(manifest.providers).join(', ')}`);

  const [liveProviderMajors, liveAwsRegions] = await Promise.all([fetchProviderMajors(), fetchAwsRegions()]);
  console.log(`Live: providers ${JSON.stringify(liveProviderMajors)}, ${liveAwsRegions.length} AWS regions`);

  const { hasDrift, lines } = computeDrift(manifest, { liveProviderMajors, liveAwsRegions });

  // Collect open issues first so an all-clear run can close a stale one.
  const openIssues = await getOpenDriftIssues();

  if (!hasDrift) {
    console.log('No drift detected.');
    for (const issue of openIssues) {
      await gh(`/issues/${issue.number}/comments`, 'POST', {
        body: `Resolved — the allowlist now matches live provider catalogues (checked ${new Date().toISOString().slice(0, 10)}). Closing automatically.`,
      });
      await gh(`/issues/${issue.number}`, 'PATCH', { state: 'closed', state_reason: 'completed' });
      console.log(`Auto-closed resolved drift issue #${issue.number}`);
    }
    return;
  }

  if (openIssues.length > 0) {
    console.log(`Drift detected; open issue #${openIssues[0].number} already tracks it — skipping duplicate.`);
    return;
  }

  await ensureLabel();
  const today = new Date().toISOString().slice(0, 10);
  const body = `## IaC allowlist drift — ${today}

The grounding L1 allowlists in \`src/lib/iac-allowlists.ts\` (last verified ${manifest.lastVerified}) have drifted from live provider catalogues:

${lines.map(l => `- ${l}`).join('\n')}

### Fix
1. Update the affected values in \`src/lib/iac-allowlists.ts\`.
2. Bump \`LAST_VERIFIED\` to today.
3. Adjust the relevant unit tests in \`tests/unit/iac-allowlists.test.ts\` if the sets changed.

This is advisory drift: until fixed, the generator's L1 review notes only *under-warn* (a real region/version is not flagged). Nothing is blocked.

---
*Generated by [IaC Allowlist Drift Check](../../actions/workflows/iac-allowlist-drift.yml). Sources: [Terraform Registry](https://registry.terraform.io), [AWS ip-ranges.json](https://ip-ranges.amazonaws.com/ip-ranges.json).*`;

  const ok = await gh('/issues', 'POST', { title: `IaC allowlist drift detected [${today}]`, body, labels: [LABEL] });
  console.log(ok ? 'Filed drift tracking issue.' : 'Failed to file drift issue.');
  if (!ok) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
