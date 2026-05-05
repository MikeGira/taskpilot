# TaskPilot — Claude Session Memory

_Last updated: 2026-05-05 (session 5)_
_Resume guide: read this file → PLAN.md → CLAUDE.md → `git log --oneline -10`_

---

## Current Status: LIVE, REVENUE-ENABLED ✅

**URL:** https://taskpilot-umber.vercel.app
**Repo:** https://github.com/MikeGira/taskpilot (public)
**Stripe:** LIVE mode ✅ — first real $19 sale confirmed end-to-end
**Admin email:** autokitadmin@gmail.com
**Vercel plan:** Hobby (60s function timeout hard cap — streaming needed for complex scripts)

---

## What Was Done This Session (2026-05-03 to 2026-05-05)

### Stripe LIVE Switch ✅
- Switched from TEST to LIVE keys in Stripe dashboard
- Updated all 4 Vercel env vars: STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET
- Ran `npm run setup:webhook` — confirmed: `Stripe mode: LIVE, Webhook correctly configured`
- Test purchase completed: charge ✅, email ✅, download link ✅, Supabase record ✅

### Generator Timeout Debugging (multiple rounds)
Root cause identified: `max_tokens: 16384` at ~200 tok/s = ~82s generation time, exceeding Vercel's 60s limit on Hobby plan. Chain of fixes attempted:
1. Added `maxDuration = 60` + `AbortController` → AbortController fired immediately in serverless (reverted)
2. Reduced `max_tokens: 8192` → still timed out
3. Added Anthropic prompt caching (`anthropic-beta` header + array system prompt) → **CAUSED REGRESSION**: existing complex scripts returned null/empty
4. **Final fix:** restored `max_tokens: 16384` (required for 1100-line scripts), removed prompt caching, set `maxDuration = 300` (capped at 60s on Hobby, 300s on Pro)
5. Added frontend "Still generating..." message after 12 seconds (stays)

**Current state:** Generator works for most tasks on Hobby plan. Complex scripts (>500 lines) may hit the 60s limit. Streaming is the proper fix — documented in PLAN.md.

### Download Improvement ✅
- Generated scripts now include a header when downloaded with: title, description, and all "Before You Run" notes as comments
- `buildDownloadContent()` extracted to `src/lib/utils.ts` — shared between main generator and Pilot panel
- Both generator page downloads and Pilot panel downloads now include the header

### Prompt Length Hint ✅
- Task input shows a yellow hint when description >800 characters:
  "Focused tasks generate the most complete scripts..."

### PowerShell System Prompt Quality Fix ✅
Added explicit anti-pattern rules to the PowerShell tool section in `buildToolSection()`:
- String quoting: never use `\"` inside double-quoted strings; use `'"{0}"' -f` pattern
- Function naming: never name custom functions the same as built-in cmdlets (Register-ScheduledTask, etc.)
- CmdletBinding: functions using `$PSCmdlet.ShouldProcess()` must declare `[CmdletBinding(SupportsShouldProcess)]`

### PLAN.md Updated
- **Option 0:** Script Review & Fix feature — "Review & Fix" button sends script to Claude for bug detection; returns issue list + corrected script; can be Pro-gated
- **Option 1:** Streaming script generation — documented with full implementation plan
- **Option 2:** Pro Generator tier ($12/mo) — spec unchanged

### COMPLEXITY RULE Added to System Prompt
- If task >350 lines: implement core functionality + TODO markers
- Always generate something — never return script: null

### Personal Files (gitignored)
- `MASTER_PROFILE.md` — Mike's complete AI context profile v4.0 (copy-paste into any AI)
- `my_conversation_with_chatGPT.md` — ChatGPT conversation for context
- `TRAINING_PLAN.md` — updated: 1.5h/day training + 1h Coursera = 2.5h/day; LangGraph added to Phase 9 Week 4

### BridgeUp Supabase (separate project)
- Was about to be paused due to inactivity on free tier
- Mike exported all table data as CSV backup
- Let it pause — will unpause when BridgeUp development resumes (90-day window)

---

## Critical File Map

```
src/app/api/generate/route.ts          ← 27-tool prompts, PowerShell quality rules, maxDuration=300, max_tokens=16384
src/components/generator/generator-wizard.tsx ← 4-step wizard, slow-gen indicator, prompt-length hint
src/components/assistant/chat-widget.tsx      ← Pilot panel, uses buildDownloadContent from utils
src/components/ui/card.tsx             ← border-white/25
src/components/dashboard/dashboard-nav.tsx    ← mobile nav #9CA3AF
src/app/(marketing)/page.tsx           ← landing page
src/lib/utils.ts                       ← buildDownloadContent() (shared by wizard + chat-widget)
src/lib/rate-limit.ts                  ← x-real-ip priority
src/lib/validations.ts                 ← productSlug allowlist
src/app/api/webhook/stripe/route.ts    ← Stripe webhook (live mode)
src/middleware.ts                      ← auth guard
next.config.mjs                        ← security headers
PLAN.md                                ← Option 0: Review & Fix | Option 1: Streaming | Option 2: Pro tier
TRAINING_PLAN.md                       ← personal (gitignored)
MASTER_PROFILE.md                      ← personal AI context profile (gitignored)
```

---

## What's Next (priority order)

### Immediate
1. **Start TRAINING_PLAN.md** — Day 1 not yet started. Linux sprint (5 days) → Azure Month 1
2. **LinkedIn post** — drafted in session, ready to publish (TaskPilot launch announcement)

### Build Queue (in order per PLAN.md)
3. **Script Review & Fix** (Option 0) — 1 day. "Review & Fix" button on result step.
4. **Streaming** (Option 1) — 2–3 days. Removes 60s timeout ceiling entirely.
5. **Pro Generator Tier** (Option 2) — $12/mo. SQL ready, spec in PLAN.md. Build after streaming.
6. **Dynamic Kit Builder** (Option 3) — $25 custom ZIP.

### Infrastructure
7. **Upgrade Vercel to Pro** ($20/mo) — extends timeout to 300s for complex scripts without streaming. Optional bridge until streaming is built.

### Maintenance
8. **Upgrade Next.js 14 → 15** — CVEs mitigated by config; upgrade when convenient
9. **Upstash Redis** — replace in-memory rate limiter at scale

---

## Generator Architecture (important for debugging)

```
POST /api/generate
├── Rate limit: 10/hr per IP (in-memory, resets on cold start)
├── Input validation: Zod schema, VALID_TOOLS allowlist, 8192 char max
├── Anthropic: claude-sonnet-4-6, max_tokens: 16384, system as plain string
├── maxDuration: 300 (Vercel caps at plan limit: 60s Hobby, 300s Pro)
├── Error handling: API errors, JSON parse failures, timeout catch
└── Returns: GenerateResult JSON
```

**Known timeout behavior on Hobby plan:**
- Simple scripts (<200 lines): complete in ~5–15s ✅
- Medium scripts (200–500 lines): complete in ~20–40s ✅ (usually)
- Complex scripts (500–1100 lines): complete in ~50–90s — may timeout ⚠️

---

## Git Log (session 5)

```
9b41805 fix: PowerShell system prompt quality rules + Review & Fix in PLAN.md
d4c11f4 fix: Pilot panel downloads include step-by-step header; buildDownloadContent to shared utils
fec3671 fix: restore max_tokens 16384 + remove broken prompt caching; maxDuration=300; streaming in PLAN.md
05f7c36 feat: embed configNotes header in downloaded scripts; prompt-length hint >800 chars
b98b160 fix: max_tokens 5120 + COMPLEXITY RULE (intermediate step)
5212988 fix: max_tokens 4096 (intermediate step)
2709f87 perf: prompt caching attempt (reverted — caused regression)
32dd0ee fix: remove AbortController (caused immediate abort in serverless)
7feaba4 fix: maxDuration + AbortController (AbortController reverted next commit)
96dc9d7 chore: gitignore tool-generated Stripe skill files
7fb7bdf chore: gitignore ChatGPT conversation + master profile
```

---

## Environment

| Key | Value / Notes |
|-----|--------------|
| `NEXT_PUBLIC_SITE_URL` | https://taskpilot-umber.vercel.app |
| `STRIPE_SECRET_KEY` | `sk_live_...` (LIVE mode ✅) |
| `STRIPE_WEBHOOK_SECRET` | Live webhook secret — update if URL changes |
| `STRIPE_PRICE_ID` | `price_live_...` |
| `ANTHROPIC_API_KEY` | Vercel dashboard |
| `ADMIN_EMAIL` | `autokitadmin@gmail.com` |
| `RESEND_FROM_EMAIL` | `hello@blog.h0m3labs.store` |

---

## Known Issues / Watch List

| Issue | Status | Fix |
|-------|--------|-----|
| Complex scripts timeout on Hobby | Ongoing | Upgrade to Vercel Pro OR build streaming |
| Rate limiter in-memory | Post-launch | Upgrade to Upstash Redis |
| Next.js 14 CVEs | Post-launch | Mitigated by config; upgrade to v15 |
| Playwright tests (auth + generator) | On hold | Next.js App Router hydration timing |

---

## Personal Notes

- **Mike's WhatsApp capture script** is at `D:\Projects\TaskPilot Downloads\WhatsApp-ScreenshotCapture - Personal.ps1`
  - Complete, reviewed, fixed: CSV quoting, Register-CaptureTask naming, RetentionDays=0, contact navigation added
  - Contact: set `TargetContactName = 'Louis I&M Bank Recovery'` in $Config
  - WhatsApp must be running (minimized to taskbar OK, fully closed = no capture)
- **Training plan:** 9-phase DevSecOps curriculum, Phase 1 = Linux sprint (5 days), then Azure Month 1
  - Daily commitment: 1.5h homelab + 1h Coursera = 2.5h/day
  - Google Cybersecurity cert: Course 2 of 9 in progress
  - Cisco AI Technical Practitioner: completed (add to GitHub profile + resume)
- **Master Profile v4.0** at `d:\Projects\taskpilot\MASTER_PROFILE.md` — copy-paste into any AI for full context
