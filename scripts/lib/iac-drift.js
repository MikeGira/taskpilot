'use strict';

/**
 * Pure logic for the quarterly IaC-allowlist drift check (grounding L1 staleness control).
 *
 * The allowlists in src/lib/iac-allowlists.ts are a dated snapshot. Providers add regions and
 * ship new provider majors a few times a year, so an un-refreshed list silently under-warns.
 * This module (a) parses the manifest out of the TS source — keeping ONE source of truth — and
 * (b) compares it against values fetched live from public provider sources. It is deliberately
 * pure and side-effect-free so the decision logic is unit-tested; the fetching and GitHub
 * issue-filing live in scripts/check-iac-allowlist-drift.js.
 *
 * Drift here only ever means "the snapshot is behind reality" — a missed advisory, never a wrong
 * block — so the check opens a single tracking issue rather than failing the build.
 */

/**
 * Extract the parts of the manifest the drift check verifies, straight from the TS source, so
 * the checker cannot disagree with the module it guards.
 * @param {string} tsSource contents of src/lib/iac-allowlists.ts
 * @returns {{ lastVerified: string|null, providers: Record<string, number>, awsRegions: string[] }}
 */
function parseManifest(tsSource) {
  const src = String(tsSource == null ? '' : tsSource);

  const lastVerifiedMatch = src.match(/LAST_VERIFIED\s*=\s*'([\d-]+)'/);
  const lastVerified = lastVerifiedMatch ? lastVerifiedMatch[1] : null;

  const providers = {};
  for (const m of src.matchAll(/^\s*(\w+):\s*\{[^}]*latestMajor:\s*(\d+)/gm)) {
    providers[m[1]] = Number(m[2]);
  }

  const awsRegions = [];
  const regionBlock = src.match(/AWS_REGIONS\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
  if (regionBlock) {
    for (const r of regionBlock[1].matchAll(/'([a-z0-9-]+)'/g)) {
      awsRegions.push(r[1]);
    }
  }

  return { lastVerified, providers, awsRegions };
}

/**
 * Compare the parsed manifest against live-fetched values.
 * @param {{ providers: Record<string, number>, awsRegions: string[] }} manifest
 * @param {{ liveProviderMajors: Record<string, number>, liveAwsRegions: string[] }} live
 * @returns {{ hasDrift: boolean, lines: string[] }}
 */
function computeDrift(manifest, live) {
  const lines = [];
  const providers = (manifest && manifest.providers) || {};
  const manifestRegions = new Set((manifest && manifest.awsRegions) || []);
  const liveMajors = (live && live.liveProviderMajors) || {};
  const liveRegions = (live && live.liveAwsRegions) || [];

  for (const [name, manifestMajor] of Object.entries(providers)) {
    const liveMajor = liveMajors[name];
    if (typeof liveMajor === 'number' && liveMajor > manifestMajor) {
      lines.push(
        `Terraform provider \`${name}\`: manifest pins latestMajor ${manifestMajor}, but the registry now publishes major ${liveMajor}. Update PROVIDER_VERSIONS.${name} (latestMajor + recommended).`
      );
    }
  }

  // Only new-in-live regions matter: a region that exists live but not in the manifest means the
  // advisory scan would wrongly flag it. Regions in the manifest but not in `live` are ignored —
  // the live source may be partial, and dropping a real region can only under-warn.
  const newRegions = liveRegions.filter((r) => !manifestRegions.has(r));
  if (newRegions.length) {
    lines.push(
      `AWS regions missing from the manifest: ${[...new Set(newRegions)].sort().join(', ')}. Add them to AWS_REGIONS so they are not falsely flagged.`
    );
  }

  return { hasDrift: lines.length > 0, lines };
}

module.exports = { parseManifest, computeDrift };
