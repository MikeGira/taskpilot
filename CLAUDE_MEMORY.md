# TaskPilot — Claude Session Memory

_Last updated: 2026-05-01 (session 4)_
_Resume guide: read this file → PLAN.md → CLAUDE.md → `git log --oneline -10`_

---

## Current Status: LIVE, SECURE & EXPANDED ✅

**URL:** https://taskpilot-umber.vercel.app
**Repo:** https://github.com/MikeGira/taskpilot (public)
**Stripe:** Still in TEST mode — switching to live is the only remaining pre-launch action
**Admin email:** autokitadmin@gmail.com (confirmed working)
**Last commits:** 27-tool expansion, mobile contrast fixes, Bicep/ARM templates added

---

## URGENT — One Manual Action Remaining Before Real Revenue

### Switch Stripe to Live Mode
1. Stripe Dashboard → toggle Test → Live
2. Developers → API Keys → copy `pk_live_...` and `sk_live_...`
3. Create live product → $19 → copy `price_live_...`
4. Update Vercel: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID`
5. Redeploy → run `npm run setup:webhook` → copy new `whsec_live_...` → update `STRIPE_WEBHOOK_SECRET` → redeploy again
6. Make one real $19 test purchase to confirm end-to-end

---

## What Was Done This Session (2026-05-01)

### Generator Expansion — 27 Tools Across 10 Categories
The AI script generator now covers the full DevSecOps + cloud toolchain:

| Category | Tools |
|----------|-------|
| Scripting | PowerShell, Bash/Shell, Python |
| Infrastructure as Code | Terraform, Pulumi, AWS CDK, Azure Bicep, ARM Templates, Packer |
| Configuration Management | Ansible, Puppet |
| CI/CD & GitOps | GitHub Actions, GitLab CI, Jenkins, Azure DevOps, ArgoCD |
| Containers & Orchestration | Docker, Kubernetes/Helm |
| Security & Compliance | CIS Hardening, HashiCorp Vault, Security Scanning |
| AI / ML & Data | AI/ML Ops (MLflow), LangChain/RAG |
| Monitoring & Observability | Prometheus+Grafana, ELK Stack |
| Database & Storage | PostgreSQL/MySQL Admin |
| Network Automation | netmiko/NAPALM/Nornir |

**Azure Bicep & ARM Templates** added after main expansion — completing IaC cloud-provider parity:
- AWS → AWS CDK ✅ | Azure → Azure Bicep ✅ + ARM Templates ✅ | Any cloud → Terraform, Pulumi ✅

**System prompt rewritten** as senior DevSecOps engineer. Each tool has a focused section:
security hardening by default, idempotency, least privilege, secrets management, correct file
extensions and language values.

**New language types** in `GenerateResult`: `'terraform' | 'yaml' | 'puppet' | 'dockerfile' | 'groovy' | 'typescript' | 'bicep' | 'json'`

**Wizard** now 4 steps: OS → Environment → **Tool** → Task. Tools grouped by category with section headers.

**Pilot panel** also updated with all 27 tools organized by category.

### Mobile Visibility & Contrast Fixes
All text colors now WCAG AA compliant on black background:

| Before | Contrast | After | Contrast |
|--------|----------|-------|---------|
| `#555` | 2.5:1 ❌ | `#9CA3AF` | 6.4:1 ✅ |
| `#4B5563` | 1.8:1 ❌ | `#6B7280` | 4.6:1 ✅ |
| `#777` | 4.4:1 ❌ | `#9CA3AF` | 6.4:1 ✅ |
| `#888` | 4.9:1 ⚠️ | `#A0A0A0` | 6.7:1 ✅ |

Card borders bumped for mobile visibility:
- `card.tsx` base: `border-white/20` → `border-white/25`
- Login card: `border-white/8` → `border-white/20`
- Unsubscribe card: `border-white/8` → `border-white/20`
- Pilot panel: `border-indigo-500/30` → `border-indigo-500/50`
- Pilot panel header dividers: `border-white/8` → `border-white/15`
- Metrics bar desktop dividers: `bg-white/10` → `bg-white/25`
- Mobile bottom nav inactive: `#555` → `#9CA3AF`

### .gitignore Updates
- `TRAINING_PLAN.md` added to `.gitignore` — personal file, never pushed to GitHub
- Playwright test results already gitignored

### Training Plan Created
- File: `d:\Projects\taskpilot\TRAINING_PLAN.md` (gitignored — personal)
- 9-phase, 238-day hands-on DevSecOps homelab training program for Mike
- Homelab: 2× HP ProBook 650 G5, Proxmox cluster
- Phase 1 (Days 1–20): Linux & Bash — fully written with daily tasks and commands
- Phases 2–9: outlined at high level; detailed when reached
- Current status: Day 1 not yet started
- When Mike reports back: read TRAINING_PLAN.md, update Session Log table, mark checkbox

---

## Critical File Map

```
src/app/api/generate/route.ts                 ← 27-tool system prompts, buildToolSection()
src/components/generator/generator-wizard.tsx ← 4-step wizard, TOOL_OPTIONS with categories
src/components/assistant/chat-widget.tsx      ← Pilot panel, TOOL_CATEGORIES_PILOT
src/components/ui/card.tsx                    ← border-white/25 (bumped for mobile)
src/components/dashboard/dashboard-nav.tsx    ← mobile nav #9CA3AF (was #555)
src/app/(marketing)/page.tsx                  ← landing page, metrics dividers bg-white/25
src/lib/rate-limit.ts                         ← x-real-ip priority (spoofing protected)
src/lib/validations.ts                        ← productSlug z.enum allowlist
src/app/api/webhook/stripe/route.ts           ← Stripe webhook handler
src/middleware.ts                             ← auth guard, getUser() not getSession()
next.config.mjs                              ← all security headers
TRAINING_PLAN.md                             ← personal training plan (gitignored)
PLAN.md                                      ← Pro tier + Dynamic Kit Builder specs
```

---

## What's Next (priority order)

### Immediate
1. **Switch Stripe to live mode** (steps above) — only blocker to real revenue
2. Review ChatGPT conversation Mike wants to share (pending next message)

### Post-Launch
3. Pro Generator Tier — $12/month, full spec in PLAN.md (SQL ready, file specs ready)
4. Dynamic Kit Builder — $25 custom ZIP, Option 3 in PLAN.md
5. Upgrade Next.js 14 → 15 (CVE mitigation)
6. Upgrade in-memory rate limiter → Upstash Redis

### Training (personal)
7. Mike starts TRAINING_PLAN.md Day 1 — create Ubuntu 22.04 VM in Proxmox

---

## Git Log (recent)

```
bc02beb fix: improve mobile text contrast and card visibility
a98854b feat: add Azure Bicep and ARM Templates to IaC category (27 tools total)
7d9af29 feat: expand to 25 tools across 10 categories — Security, AI/ML, Monitoring, IaC, and more
c48ef4e feat: expand generator to full DevSecOps platform — Terraform, Ansible, Docker, CI/CD, and more
4aaf1ee docs: update README, CLAUDE.md, and CLAUDE_MEMORY.md to reflect current session state
d360684 security: fix IP spoofing, HTML injection in emails/export, missing rate limits, productSlug allowlist
```

---

## Environment

| Key | Value / Location |
|-----|-----------------|
| `NEXT_PUBLIC_SITE_URL` | https://taskpilot-umber.vercel.app |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel dashboard |
| `STRIPE_SECRET_KEY` | Test key (`sk_test_...`) — **switch to live before launch** |
| `STRIPE_WEBHOOK_SECRET` | Vercel dashboard — update after running setup:webhook with live keys |
| `ANTHROPIC_API_KEY` | Vercel dashboard |
| `ADMIN_EMAIL` | `autokitadmin@gmail.com` |

---

## Known Issues / Watch List

| Issue | Status | Fix |
|-------|--------|-----|
| Stripe in TEST mode | **URGENT** | Switch to live keys (steps above) |
| Rate limiter in-memory | Post-launch | Upgrade to Upstash Redis |
| Next.js 14 CVEs | Post-launch | Mitigated by config; upgrade to v15 |
| Playwright tests (auth + generator) | On hold | Next.js App Router hydration timing — not an app bug |
