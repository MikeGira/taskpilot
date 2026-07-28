---
description: Pull the full security and CI state for this repo and remediate it, without being handed any links
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, WebSearch, WebFetch
---

Triage everything currently outstanding in this repository. **Gather the state yourself — do not
wait to be given links, issue numbers, or the text of a monitor email.** Everything below is
reachable from the working directory with `gh` and `npm`.

## 1. Collect (all of it, before analysing any of it)

```bash
gh issue list  --repo MikeGira/taskpilot --state open --limit 50
gh pr list     --repo MikeGira/taskpilot --state open --limit 50
gh run list    --repo MikeGira/taskpilot --limit 15 --json name,event,status,conclusion,createdAt,databaseId
gh api repos/MikeGira/taskpilot/dependabot/alerts --jq '.[]|select(.state=="open")|[.security_advisory.severity,.dependency.package.name,.security_advisory.ghsa_id,.security_vulnerability.first_patched_version.identifier]|@tsv'
gh api repos/MikeGira/taskpilot/code-scanning/alerts --jq '.[]|select(.state=="open")|[.rule.security_severity_level,.rule.id,.most_recent_instance.location.path,.number]|@tsv'
gh api repos/MikeGira/taskpilot/commits/main/check-runs --jq '.check_runs[]|select(.app.slug=="github-advanced-security")|{name,conclusion,title:.output.title}'
npm audit --json
node scripts/audit-gate.js
```

For every failing run, read the actual failing job log (`gh run view <id> --log-failed`) before
forming any theory about the cause.

## 2. Ground every claim before acting on it

Three rules, each of which exists because it was broken before:

- **Verify versions against the GitHub Advisory API, never against recall or a monitor email.**
  `firstPatchedVersion` is authoritative for "what fixes this"; `npm view <pkg> versions` is
  authoritative for "what exists". A version number that appears in neither is not real.
- **Verify AI-reported findings against the source.** Issues from the `ai-code-quality` bot have a
  significant false-positive rate — issue #80's findings were all false, and issue #92 claimed
  `if (!customerEmail)` fails to catch `''`, which is simply wrong. Read the cited lines and prove
  the finding before writing a fix. Record confirmed false positives in
  `.github/audit-exceptions.md` so the same finding is not re-litigated next month.
- **Verify the fix does not regress anything.** `npm audit fix --force` proposes downgrades. Never
  accept a plan that lowers a dependency version.

## 3. Remediate

- Dependency vulnerabilities reachable from production: `node scripts/security-autofix.js
  --dry-run` shows the plan; the scheduled workflow applies it. Only intervene when it reports
  something unfixable.
- Dev-only advisories with no compatible fix: add a dated, scoped entry to
  `.github/audit-allowlist.json` with a justification that states *why* no fix exists. The gate
  fails when the date lapses, which is the point.
- Green Dependabot PRs: merge them.
- Real code findings: fix, with a regression test.
- False-positive findings: close the issue with the evidence, and record it in
  `.github/audit-exceptions.md`.

## 4. Report

Give a table of: finding, verdict (real / false positive / accepted-with-expiry), action taken, and
link. State plainly anything you could not resolve and why. Do not report work as complete unless
its CI checks are green.
