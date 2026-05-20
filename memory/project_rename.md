---
name: project-taskpilot-rename
description: "TaskPilot → PilotKit rename — name confirmed, pilotkit.dev available, pending Mike's purchase"
metadata:
  type: project
---

App is being renamed from **TaskPilot** to **PilotKit** at **pilotkit.dev**.

**Why:** taskpilot.app is an existing NZ field service SaaS (B2B, has LinkedIn/Facebook/X/Instagram handles). SEO conflict, trademark risk, can't rank for "taskpilot" or own any handles. Must rename before LinkedIn launch.

**How to apply:** Mike is purchasing pilotkit.dev on 2026-05-27. If the session is on or after that date, confirm purchase and execute the rename immediately. LinkedIn launch is blocked until rename is live.

---

## Domain status (checked 2026-05-20)
- `pilotkit.dev` — **AVAILABLE** — buy this (.dev requires HTTPS; Vercel handles automatically)
- `pilotkit.io` — Registered 2025 (taken)
- `pilotkit.com` — Registered 2016 (taken)

## Why PilotKit
- "Pilot" keeps the Pilot AI assistant branding
- "Kit" references the $19 Starter Kit product
- No existing SaaS found with this name (checked 2026-05-20)
- All alternatives already taken: InfraPilot, ScriptForge, OpsPilot, SysPilot, ScriptSmith, AdminKit, AdminForge, ITForge, ScriptKit, AutoKit, RunForge, ScriptPilot, ShellSmith, IaCpilot

## Technical rename scope — execute in this order
1. **UI text** — search all `.tsx`/`.ts` files for "TaskPilot", replace with "PilotKit" (case-sensitive, check capitalization)
2. **Pilot AI system prompt** — `src/app/api/assistant/route.ts` line 14: update platform name and Vercel URL to pilotkit.dev
3. **Metadata/SEO** — `<title>`, `og:title`, descriptions in `src/app/layout.tsx` and page files
4. **README.md and PROGRESS.md** — update name and live URL
5. **Vercel** — Mike adds pilotkit.dev as custom domain in Vercel dashboard (Settings → Domains)
6. **GitHub repo** — Mike renames MikeGira/taskpilot → MikeGira/pilotkit (GitHub Settings → General → Repository name)
7. **Stripe product name** — cosmetic, doesn't affect checkout
8. **Supabase project name** — cosmetic, doesn't affect function

## LinkedIn launch post
Ready to finalize with new name and pilotkit.dev URL after rename is live.
Screenshot to take: `/generate` → Linux → Cloud → Terraform → "Provision an AWS VPC with public/private subnets, NAT gateway, and security groups for a 3-tier web application" → screenshot the result step with code visible. 1200×1200 square.
