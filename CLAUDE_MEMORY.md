# TaskPilot — Claude Session Memory

_Last updated: 2026-04-29 (second major session)_
_Resume guide: read this file → PLAN.md → CLAUDE.md → `git log --oneline -10`_

---

## Current Status: LIVE & FUNCTIONAL ✅

**URL:** https://taskpilot-umber.vercel.app
**Repo:** https://github.com/MikeGira/taskpilot (public)
**Stripe:** TEST mode — switch to live keys before real revenue
**Last commits:** setup-webhook script, confirmation email fix, 5 new PS scripts

---

## URGENT — Action Required Before Next Sale

### 1. Fix Stripe Webhook (CRITICAL)
The webhook URL in Stripe points to `/api/webhook` instead of `/api/webhook/stripe`.
All 105 webhook deliveries this week failed. This means NO confirmation emails
and NO purchase records were created via webhook (session download fallback worked).

**Fix:**
```bash
npm run setup:webhook
```
This script auto-finds the webhook, fixes the URL, and strips events to only
`checkout.session.completed`. After running, Stripe will show a new signing secret.
Update `STRIPE_WEBHOOK_SECRET` in Vercel → Settings → Environment Variables, then redeploy.

### 2. Rebuild and Re-upload the Kit ZIP
The kit ZIP in Supabase Storage (`products/taskpilot-kit.zip`) still has 4 scripts.
The project now has 9 scripts in `scripts/ps/`. You need to:
1. Zip all files in `scripts/ps/` → `taskpilot-kit.zip`
2. Go to Supabase Dashboard → Storage → products bucket
3. Delete old `taskpilot-kit.zip`, upload new one at same path

---

## What's Fully Built and Shipped

### Core Product
- Landing page (9-script count throughout), animations, HeroBeams, AnimatedTerminal (fixed height — no layout shift), AnimatedArcs, FadeInSection
- Stripe checkout (TEST mode), magic link auth, dashboard downloads (server-side signed URLs)
- Supabase Storage: `products` bucket, `products/taskpilot-kit.zip`
- Account management + GDPR deletion + HTML data export (replaces raw JSON)
- Newsletter + HMAC unsubscribe tokens

### AI Script Generator (/generate)
- 3-step wizard: OS → Environment (+cloud providers) → Task description
- Scroll-aware back button: shows in header on load, second copy fades in above wizard when user scrolls past header (IntersectionObserver, no arbitrary thresholds)
- Clarification loop + robust JSON parser (handles Python `"""` docstrings)
- Feedback widget (👍/👎) → saved to Supabase + emails admin
- Rate limiting: 10/hr per IP
- max_tokens: 16384 (raised from 8192 to prevent truncation of complex scripts)
- Null-script error state: shows "Generation incomplete" + AlertCircle icon when script field is null (not a misleading success state)

### Pilot AI Assistant
- Floating chat widget with pilot helmet SVG avatar
- Two tabs: Ask Pilot (chat) + Generate Script (mini wizard)
- Generate tab now has cloud provider selection (AWS, Azure, GCP, DigitalOcean, Linode, **Supabase**) that appears inline when Cloud/Hybrid/Multi-Cloud is selected
- Copy/download: uses shared `copyToClipboard` + `downloadTextFile` utilities from `lib/utils.ts` (reliable cross-browser pattern, navigator.clipboard with execCommand fallback, application/octet-stream MIME type)
- Null-script error state in result step: shows error message + Try Again, hides config notes and "Ask Pilot" link
- "Ask Pilot" template string: uses `title ?? filename ?? 'a custom IT script'` fallback (no more "null" in message)
- Clarification: proper clarify step with question display + answer input (no longer appends question to task text)
- Error handling: genError state shown above Generate button (rate limit, network errors visible)
- System prompt: no em-dashes, no "Perfect/Great/Absolutely" openers, one compound requirements question before task description, updates full task desc when user adds requirements

### Dashboard
- Mobile bottom tab nav (DashboardNav client component with active state via usePathname)
- Download card: fixed download bug (document.body.appendChild before click)
- Empty state: border-white/20
- Analytics: emerald green progress bar for positive rate (was red — inverted meaning)

### UI / Design
- Pure black (#000) + white theme
- All cards: border-white/20 globally (raised from border-white/8)
- Nav: spring cubic-bezier pill animation on hover (NavItem)
- Sign In button uses NavItem (same animation)
- Step cards: h-full for equal height in CSS grid
- Newsletter section wrapped in Card
- Contact form wrapped in Card
- Environment cards (Works Everywhere): 2x2 card grid, border opacity /40
- Before/After cards: brighter colored borders
- Scroll-to-top button: bottom-left fixed (avoids Pilot button), appears after 400px scroll
- Footer logo: clickable Link to home (was plain div)
- Generator back button: top-left of header + scroll-aware second copy above wizard

### Confirmation Email
- Webhook path: fires immediately when Stripe delivers the event
- Fallback path: fires from `/api/download/session` when purchase record doesn't exist yet (webhook didn't fire). Checks existence BEFORE upsert — only sends once.
- Email includes: direct "Download Kit Now" button with session URL (no login needed) + secondary Dashboard link

### Security
- Rate limiting on ALL public API routes
- Zod validation on all POST endpoints
- Supabase RLS on all tables
- Middleware excludes /api/ routes (API routes handle own auth)

### Scripts in Kit (scripts/ps/)
1. reset-password.ps1 — Reset AD passwords, audit log, force change on next login
2. disk-cleanup.ps1 — Temp file cleanup, disk space alerts by threshold
3. new-user.ps1 — Create AD account from params, assign groups, set temp password
4. health-check.ps1 — CPU/RAM/disk monitoring, scheduled email summary
5. offboard-user.ps1 — Disable account, remove groups, archive home folder, email HR (**NEW**)
6. account-deactivation.ps1 — Disable accounts inactive >90 days, move to disabled OU, CSV audit (**NEW**)
7. security-report.ps1 — Failed logins (4625) + lockouts (4740), CSV export + email (**NEW**)
8. provision-device.ps1 — Pre-stage AD computer account, device group, asset inventory (**NEW**)
9. decommission-device.ps1 — Safety confirm, remove from AD, update asset inventory (**NEW**)
   Plus: config.json (updated with 11 new fields), scheduler.xml, setup-guide.md

---

## What's Next (priority order)

### 1. Fix Webhook + Rebuild ZIP (URGENT — see above)
Do this before the next test purchase.

### 2. Switch Stripe to Live Mode
When ready for real revenue:
- Stripe Dashboard → switch Test to Live
- Get live keys (`sk_live_...`, `pk_live_...`)
- Create live product + price → new `STRIPE_PRICE_ID`
- Update all 4 Stripe vars in Vercel → redeploy
- Run `npm run setup:webhook` again with live secret key

### 3. Pro Generator Tier (Option 2)
Full spec in PLAN.md. Requires running SQL in Supabase first.
- Tables: `subscriptions`, `generated_scripts`
- New Stripe product: $12/month recurring → `STRIPE_PRO_PRICE_ID`
- New files: `api/subscription/create`, `api/subscription/portal`, `dashboard/billing/page.tsx`, `lib/subscription.ts`
- Modify: `api/generate/route.ts` (gate unlimited use), `dashboard/layout.tsx` (add Billing nav)
- When Pro is live: run `npm run setup:webhook -- --pro` to add subscription webhook events

### 4. Dynamic Kit Builder (Option 3)
User picks script types → AI generates custom ZIP → $25 one-time

---

## Critical File Map

```
src/app/api/generate/route.ts           ← Script generator (claude-sonnet-4-6, 16384 tokens)
src/app/api/assistant/route.ts          ← Pilot chat (claude-haiku-4-5, 800 tokens)
src/app/api/download/session/route.ts   ← Post-purchase download + email fallback
src/app/api/download/[product]/route.ts ← Dashboard download (server-side URL)
src/app/api/webhook/stripe/route.ts     ← Stripe webhook (purchase record + email)
src/app/api/account/export/route.ts     ← GDPR export (HTML format)
src/app/auth/callback/route.ts          ← Magic link callback
src/middleware.ts                       ← Auth guard for /dashboard
src/lib/utils.ts                        ← copyToClipboard(), downloadTextFile() shared utils
src/components/assistant/chat-widget.tsx   ← Pilot widget (chat + generate tabs)
src/components/generator/generator-wizard.tsx  ← Main generator
src/components/generator/wizard-back-button.tsx  ← Scroll-aware back button (IntersectionObserver)
src/components/dashboard/dashboard-nav.tsx       ← Dashboard nav (active state + mobile tabs)
src/components/animations/animated-terminal.tsx  ← h-[240px] fixed height (no layout shift)
src/app/(marketing)/page.tsx            ← Landing page (9 scripts, cards, environment grid)
scripts/ps/                             ← All 9 PowerShell scripts + config + guide
scripts/setup-webhook.js               ← npm run setup:webhook (fixes URL + events)
PLAN.md                                ← Full monetization roadmap (SQL + file specs)
```

---

## Environment

| Key | Value / Location |
|-----|-----------------|
| `NEXT_PUBLIC_SITE_URL` | https://taskpilot-umber.vercel.app |
| `SUPABASE_SERVICE_ROLE_KEY` | In Vercel dashboard |
| `STRIPE_SECRET_KEY` | Test key (`sk_test_...`) — in Vercel |
| `STRIPE_WEBHOOK_SECRET` | **NEEDS UPDATE** after running setup:webhook |
| `ANTHROPIC_API_KEY` | In Vercel dashboard |
| `ADMIN_EMAIL` | `autokitadmin@email.com` — unlocks /dashboard/analytics |

---

## Known Issues / Watch List

| Issue | Status | Fix |
|-------|--------|-----|
| Stripe webhook URL wrong | **URGENT** | Run `npm run setup:webhook`, update STRIPE_WEBHOOK_SECRET in Vercel |
| Kit ZIP still has 4 scripts | **URGENT** | Rebuild ZIP from scripts/ps/, re-upload to Supabase |
| Stripe in TEST mode | Open | Switch to live keys when ready |
| Rate limiter in-memory | MVP-OK | Upgrade to Upstash Redis when scaling |

---

## Open Decisions

1. **Pro tier price:** $9/mo vs $12/mo vs $15/mo — not decided
2. **Script history storage:** Supabase table vs Vercel KV
3. **Pro gate:** hard block free users or soft-nudge CTA
4. **Custom domain:** taskpilot.dev (not yet set up)
5. **Pilot real photo:** user has pilot helmet image but hasn't copied to `public/pilot.png`
