// Grounding discipline, Layer 1 (take high-entropy values away from the model) — advisory tier.
//
// Cost-bearing literals *inside* a generated script — cloud regions, instance sizes, IaC
// provider versions — are the classic LLM fabrication: a plausible-looking `us-east-3` or a
// `~> 9.0` aws provider that does not exist. We cannot hard-block them (the catalogue is large
// and shifts, and a wrong block costs the user their whole generation), so this module produces
// ADVISORY notes appended to the result. It only ever *under-warns*; it never rejects output.
//
// The same PROVIDER_VERSIONS manifest is consumed by Layer 2 (route.ts injects these pins into
// the system prompt) so the model is told the correct versions rather than guessing them. One
// source of truth, checked for drift by scripts/check-iac-allowlist-drift.js.

// The catalogues below are a dated snapshot. `scripts/check-iac-allowlist-drift.js` re-verifies
// the live-checkable ones (Terraform provider versions, AWS regions) against public provider
// sources on a quarterly schedule and opens a tracking issue on drift. Because every use is
// advisory, staleness can only cause a missed warning, never a wrong rejection.
export const LAST_VERIFIED = '2026-07-19';

// ── Provider / module versions (shared L1 + L2) ─────────────────────────────────────────────
// Source: registry.terraform.io/v1/providers/hashicorp/<name> and endoflife.date/api/terraform.
// `latestMajor` is the highest real major line. A generated constraint whose major exceeds this
// is a fabricated future version — the one version signal with near-zero false positives, since
// pinning an OLDER major is legitimate and must not be flagged.
export interface ProviderPin {
  /** Terraform registry source address, or null for Terraform core itself. */
  source: string | null;
  /** Recommended pin to advertise to the model (L2). */
  recommended: string;
  /** Highest real major line as of LAST_VERIFIED — used to flag fabricated-ahead versions (L1). */
  latestMajor: number;
}

export const PROVIDER_VERSIONS: Record<string, ProviderPin> = {
  terraform: { source: null, recommended: '~> 1.15', latestMajor: 1 },
  aws: { source: 'hashicorp/aws', recommended: '~> 6.0', latestMajor: 6 },
  azurerm: { source: 'hashicorp/azurerm', recommended: '~> 4.0', latestMajor: 4 },
  google: { source: 'hashicorp/google', recommended: '~> 7.0', latestMajor: 7 },
};

// ── Cloud regions ───────────────────────────────────────────────────────────────────────────
// AWS commercial + China + GovCloud. Source: AWS ip-ranges.json region set — the full authoritative
// list (41 regions, reconciled 2026-07-19 by the drift check itself, which caught 7 the initial
// hand-curated snapshot missed). Kept current by iac-allowlist-drift.yml.
export const AWS_REGIONS = new Set([
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'us-south-1',
  'af-south-1', 'ap-east-1', 'ap-east-2', 'ap-south-1', 'ap-south-2',
  'ap-southeast-1', 'ap-southeast-2', 'ap-southeast-3', 'ap-southeast-4',
  'ap-southeast-5', 'ap-southeast-6', 'ap-southeast-7',
  'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
  'ca-central-1', 'ca-west-1',
  'eu-central-1', 'eu-central-2', 'eu-west-1', 'eu-west-2', 'eu-west-3',
  'eu-north-1', 'eu-south-1', 'eu-south-2',
  'il-central-1', 'me-central-1', 'me-south-1', 'me-west-1', 'mx-central-1',
  'sa-east-1', 'sa-west-1',
  'cn-north-1', 'cn-northwest-1',
  'us-gov-east-1', 'us-gov-west-1',
]);

// GCP regions. Source: cloud.google.com/compute/docs/regions-zones (manual, dated).
export const GCP_REGIONS = new Set([
  'us-central1', 'us-east1', 'us-east4', 'us-east5', 'us-south1',
  'us-west1', 'us-west2', 'us-west3', 'us-west4',
  'northamerica-northeast1', 'northamerica-northeast2', 'northamerica-south1',
  'southamerica-east1', 'southamerica-west1',
  'europe-central2', 'europe-north1', 'europe-north2', 'europe-southwest1',
  'europe-west1', 'europe-west2', 'europe-west3', 'europe-west4', 'europe-west6',
  'europe-west8', 'europe-west9', 'europe-west10', 'europe-west12',
  'asia-east1', 'asia-east2', 'asia-northeast1', 'asia-northeast2', 'asia-northeast3',
  'asia-south1', 'asia-south2', 'asia-southeast1', 'asia-southeast2',
  'australia-southeast1', 'australia-southeast2',
  'me-central1', 'me-central2', 'me-west1', 'africa-south1',
]);

// ── Instance / machine families ──────────────────────────────────────────────────────────────
// EC2 family tokens (the part before the dot in e.g. `m6i.large`). Source: AWS EC2 instance
// types (manual, dated). Matched as a set of known family prefixes; an unrecognized family in a
// generated `*.large`-shaped token is flagged.
export const EC2_INSTANCE_FAMILIES = new Set([
  // General purpose
  't2', 't3', 't3a', 't4g', 'm4', 'm5', 'm5a', 'm5n', 'm5zn', 'm5d', 'm5dn',
  'm6a', 'm6i', 'm6id', 'm6g', 'm6gd', 'm7a', 'm7i', 'm7i-flex', 'm7g', 'm7gd', 'm8g',
  // Compute optimized
  'c4', 'c5', 'c5a', 'c5n', 'c5d', 'c6a', 'c6i', 'c6id', 'c6g', 'c6gn', 'c6gd',
  'c7a', 'c7i', 'c7i-flex', 'c7g', 'c7gn', 'c7gd', 'c8g',
  // Memory optimized
  'r4', 'r5', 'r5a', 'r5b', 'r5n', 'r5d', 'r6a', 'r6i', 'r6id', 'r6g', 'r6gd',
  'r7a', 'r7i', 'r7iz', 'r7g', 'r7gd', 'r8g', 'x1', 'x1e', 'x2idn', 'x2iedn', 'x2gd', 'z1d',
  // Accelerated computing
  'p3', 'p4', 'p4d', 'p4de', 'p5', 'p5e', 'g4dn', 'g4ad', 'g5', 'g5g', 'g6', 'g6e', 'gr6',
  'inf1', 'inf2', 'trn1', 'trn1n', 'trn2', 'dl1', 'dl2q',
  // Storage optimized
  'i3', 'i3en', 'i4i', 'i4g', 'i7ie', 'i8g', 'im4gn', 'is4gen', 'd2', 'd3', 'd3en', 'h1',
  // HPC
  'hpc6a', 'hpc6id', 'hpc7a', 'hpc7g',
]);

// GCP machine family prefixes (the part before the first dash in e.g. `e2-standard-4`).
// Source: cloud.google.com/compute/docs/machine-resource (manual, dated).
export const GCP_MACHINE_FAMILIES = new Set([
  'e2', 'n1', 'n2', 'n2d', 'n4', 'c2', 'c2d', 'c3', 'c3d', 'c4', 'c4a', 'c4d',
  't2d', 't2a', 'tau', 'm1', 'm2', 'm3', 'm4', 'a2', 'a3', 'a4', 'g2', 'h3', 'z3', 'x4',
]);

// ── Layer 2: version grounding (retrieval-before-generation, cheap slice) ─────────────────────
// Inject the pinned provider versions from the shared manifest into the system prompt so the model
// is TOLD the current versions rather than free-generating them — wrong provider versions are the
// highest-entropy IaC fabrication. Only emitted for Terraform, the tool the manifest actually
// covers; returns '' for every other tool so the prompt stays relevant. The dated snapshot is kept
// current by the same quarterly drift check that backs L1.
export function buildVersionPinNote(tool: string | undefined): string {
  if (tool !== 'terraform') return '';
  const core = PROVIDER_VERSIONS.terraform;
  const providerLines = Object.entries(PROVIDER_VERSIONS)
    .filter(([name]) => name !== 'terraform')
    .map(([, pin]) => `- ${pin.source}: use version = "${pin.recommended}" (latest major is ${pin.latestMajor})`)
    .join('\n');
  return `PINNED VERSIONS (as of ${LAST_VERIFIED} — use these; do NOT invent newer major versions):
- Terraform core: required_version = "${core.recommended}"
${providerLines}
For any provider not listed above, use a conservative "~> MAJOR.0" pin and note in configNotes that the exact version should be confirmed against the Terraform Registry.`;
}

const AWS_REGION_TOKEN = /\b(?:us|eu|ap|sa|ca|me|af|il|mx|cn)-(?:gov-)?[a-z]+-\d\b/g;
const GCP_REGION_TOKEN = /\b(?:us|europe|asia|australia|northamerica|southamerica|me|africa)-[a-z]+\d\b/g;
const EC2_INSTANCE_TOKEN = /\b([a-z]+\d[a-z-]*)\.(?:nano|micro|small|medium|large|(?:\d+)?xlarge|metal(?:-\d+xl)?)\b/g;
const GCP_MACHINE_TOKEN = /\b([a-z]\d[a-z]?)-(?:standard|highmem|highcpu|micro|small|medium|megamem|ultramem|highgpu|hpc)-\d+\b/g;
// required_providers idiom: `aws = { source = "hashicorp/aws", version = "~> 6.0" }`
const TF_PROVIDER_VERSION = /\b(aws|azurerm|google)\s*=\s*\{[^}]*?version\s*=\s*"([^"]+)"/g;

function uniqueMatches(script: string, re: RegExp, group = 0): string[] {
  const seen = new Set<string>();
  for (const m of script.matchAll(re)) {
    const value = m[group];
    if (value) seen.add(value);
  }
  return [...seen];
}

/**
 * Primary (pinned) major of a Terraform constraint string. The FIRST number is the baseline the
 * user is pinning to: `~> 6.0` → 6, `>= 4.0, < 5.0` → 4. Using the first — not the max — avoids
 * treating a normal exclusive upper bound (`< 5.0`) as a fabricated version.
 */
function primaryConstraintMajor(constraint: string): number {
  const m = constraint.match(/\d+/);
  return m ? Number(m[0]) : 0;
}

/**
 * Scan a generated IaC/script body for fabricated-looking cost-bearing literals and return
 * human-readable advisory notes. Never throws, never blocks — an empty array means nothing
 * looked wrong. Deliberately conservative: it flags only values that are almost certainly
 * hallucinated (unknown region, unknown instance family, a provider major ahead of what exists),
 * so a clean generation stays clean.
 *
 * Output-safety contract: every returned string is a hardcoded template. The only interpolated
 * values are tokens the fixed regexes above matched — regions/instance families/version
 * constraints whose charsets exclude quotes and HTML. The caller appends these to `explanation`,
 * a JSON string field (escaped by JSON.stringify) rendered as text by React (escaped), and the
 * codebase has no HTML/JS execution sinks (enforced by tests/unit/no-xss-sinks.test.ts). So the
 * result is safe to concatenate into the response — there is no injection path.
 */
export function scanCostBearingLiterals(script: string): string[] {
  const notes: string[] = [];

  const badAwsRegions = uniqueMatches(script, AWS_REGION_TOKEN).filter(r => !AWS_REGIONS.has(r));
  if (badAwsRegions.length) {
    notes.push(`Unrecognized AWS region(s): ${badAwsRegions.join(', ')}. Verify these exist before deploying — a non-existent region fails the whole apply.`);
  }

  const badGcpRegions = uniqueMatches(script, GCP_REGION_TOKEN).filter(r => !GCP_REGIONS.has(r));
  if (badGcpRegions.length) {
    notes.push(`Unrecognized GCP region(s): ${badGcpRegions.join(', ')}. Verify these exist before deploying.`);
  }

  const badEc2 = uniqueMatches(script, EC2_INSTANCE_TOKEN, 1).filter(f => !EC2_INSTANCE_FAMILIES.has(f));
  if (badEc2.length) {
    notes.push(`Unrecognized EC2 instance family/families: ${badEc2.join(', ')}. Confirm the instance type exists and is available in your region.`);
  }

  const badGcpMachines = uniqueMatches(script, GCP_MACHINE_TOKEN, 1).filter(f => !GCP_MACHINE_FAMILIES.has(f));
  if (badGcpMachines.length) {
    notes.push(`Unrecognized GCP machine family/families: ${badGcpMachines.join(', ')}. Confirm the machine type exists.`);
  }

  for (const m of script.matchAll(TF_PROVIDER_VERSION)) {
    const provider = m[1];
    const constraint = m[2];
    const pin = PROVIDER_VERSIONS[provider];
    if (!pin) continue;
    const declaredMajor = primaryConstraintMajor(constraint);
    if (declaredMajor > pin.latestMajor) {
      notes.push(`Terraform provider "${provider}" is pinned to major ${declaredMajor} ("${constraint}"), but the latest published major is ${pin.latestMajor} (as of ${LAST_VERIFIED}). This version likely does not exist — pin ${pin.recommended} instead.`);
    }
  }

  return notes;
}
