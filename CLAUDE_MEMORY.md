# TaskPilot — Claude Session Memory

_Last updated: 2026-04-29_
_Resume guide: read this file, then PLAN.md, then CLAUDE.md, then `git log --oneline -5`_

---

## Current Status: LIVE & FUNCTIONAL ✅

**URL:** https://taskpilot-umber.vercel.app
**Repo:** https://github.com/MikeGira/taskpilot (public)
**Stripe:** TEST mode — switch to live keys before real revenue
**Last commit:** `dd92b25` — mobile responsiveness + Sign In pill animation

---

## What's Done (all shipped)

### Core Product
- [x] Landing page with animations (HeroBeams, AnimatedTerminal, AnimatedArcs, FadeInSection)
- [x] Stripe checkout ($19 starter kit, test mode)
- [x] Supabase Auth (magic link, custom SMTP via Resend)
- [x] Dashboard: downloads generated server-side (no email-match API call)
- [x] Supabase Storage: `products` bucket, `products/taskpilot-kit.zip`
- [x] Account management + GDPR deletion
- [x] Newsletter + HMAC unsubscribe tokens

### AI Script Generator (/generate)
- [x] 3-step wizard: OS → Environment → Task description
- [x] Clickable kit cards on landing page → pre-fill generator task
- [x] Clarification loop + robust JSON parser (handles Python `"""` docstrings)
- [x] Feedback widget (👍/👎) → saved to Supabase + emails admin
- [x] Rate limiting: 10/hr per IP

### Pilot AI Assistant
- [x] Floating chat widget with pilot helmet SVG avatar (`public/pilot.svg`)
- [x] Two tabs: Ask Pilot (chat) + Generate Script (mini wizard)
- [x] claude-haiku-4-5 backend, markdown stripped from responses
- [x] No em-dashes in welcome or suggested prompts
- [x] Mobile: 16px font (no iOS zoom), full-width panel, correct height with dvh

### Admin Analytics
- [x] `/dashboard/analytics` (ADMIN_EMAIL only)
- [x] AI Prompt Improvement: Claude analyzes negative feedback → returns prompt changes

### UI / Design
- [x] Pure black (#000) + white theme (Vercel style)
- [x] All buttons rounded-full (pill), all same height (h-10)
- [x] Nav: spring cubic-bezier pill animation on hover (NavItem component)
- [x] **Sign In button uses NavItem** — same pill animation as nav links
- [x] macOS traffic light dots on animated terminal
- [x] HeroBeams: solid bright nodes (Windows=blue, Linux=yellow, Cloud=cyan, On-Prem=violet)

### Security
- [x] Rate limiting on ALL public API routes
- [x] Zod validation on all POST endpoints
- [x] Supabase RLS on all tables
- [x] Middleware excludes /api/ routes (API routes handle own auth)

---

## What's Next (priority order)

### 1. Pro Generator Tier — Option 2 (next build)
Full spec in **PLAN.md**. Summary:
- Supabase tables: `subscriptions`, `generated_scripts`
- New Stripe product: recurring $12/month
- New env var: `STRIPE_PRO_PRICE_ID`
- Files to create: `api/subscription/create`, `api/subscription/portal`, `dashboard/billing/page.tsx`, `lib/subscription.ts`
- Files to modify: `api/generate/route.ts` (gate unlimited use), `dashboard/layout.tsx` (add Billing nav)
- Run SQL in Supabase before coding (SQL in PLAN.md)

### 2. Fix Stripe Webhook (blocking for production)
The Stripe webhook at `https://taskpilot-umber.vercel.app/api/webhook/stripe` may not be firing.
- Check: Stripe Dashboard → Developers → Webhooks → verify endpoint URL and last delivery
- If failing: check signing secret matches `STRIPE_WEBHOOK_SECRET` in Vercel
- Without webhook: purchase records must be backfilled via session download route (currently works)

### 3. Switch Stripe to Live Mode
When ready for real revenue:
- Stripe Dashboard → switch from Test to Live
- Get live keys (`sk_live_...`, `pk_live_...`)
- Create live product + price → new `STRIPE_PRICE_ID`
- Update Vercel env vars (all 4 Stripe vars)
- Redeploy

### 4. Dynamic Kit Builder — Option 3 (after Pro tier)
Full spec in PLAN.md. User selects script types → AI generates custom ZIP → $25 one-time.

---

## Recent Fixes (this session)

| Commit | What |
|--------|------|
| `dd92b25` | Mobile: iOS zoom fix (16px inputs), full-width Pilot panel, terminal visibility, Sign In pill |
| `1a27d73` | Dashboard: server-side signed URLs (definitive download fix), HeroBeams solid/bright |
| `eb3d830` | JSON parser: Python `"""` fix, clickable kit cards, Pilot welcome cleanup |
| `43425a4` | Dashboard download Stripe fallback, pilot.svg helmet avatar |
| `1df5257` | Nav spring animation (constant transition), kit icons brightness, Pilot avatar |

---

## Known Issues / Watch List

| Issue | Status | Fix |
|-------|--------|-----|
| Stripe in TEST mode | Open | Switch to live keys when ready |
| Stripe webhook may not fire | Open | Check Stripe Dashboard; session download backfills as fallback |
| Rate limiter in-memory | MVP-OK | Upgrade to Upstash Redis when scaling |
| Pilot image = SVG helmet | OK | User can replace with real photo at `public/pilot.png` |

---

## Critical File Map

```
src/app/api/generate/route.ts          ← Script generator (claude-sonnet-4-6, 8192 tokens)
src/app/api/assistant/route.ts         ← Pilot chat (claude-haiku-4-5, 512 tokens)
src/app/api/download/session/route.ts  ← Post-purchase download (Stripe verify + signed URL)
src/app/api/download/[product]/route.ts ← Dashboard download (server-side URL, no re-auth)
src/app/api/webhook/stripe/route.ts    ← Stripe webhook (creates purchase records)
src/app/auth/callback/route.ts         ← Magic link callback (NextRequest cookie pattern)
src/middleware.ts                      ← Auth guard for /dashboard (excludes /api/)
src/components/assistant/chat-widget.tsx  ← Pilot widget (chat + generate tabs)
src/components/animations/            ← HeroBeams, AnimatedTerminal, AnimatedArcs, FadeInSection
src/components/layout/navbar.tsx       ← NavItem spring pill animation (used for Sign In too)
supabase/schema.sql                    ← All tables + RLS (run once)
PLAN.md                                ← Full monetization roadmap with SQL and file specs
```

---

## Environment

| Key | Value / Location |
|-----|-----------------|
| `NEXT_PUBLIC_SITE_URL` | https://taskpilot-umber.vercel.app |
| `SUPABASE_SERVICE_ROLE_KEY` | In Vercel dashboard (confirmed working) |
| `STRIPE_SECRET_KEY` | Test key (`sk_test_...`) — in Vercel |
| `ANTHROPIC_API_KEY` | In Vercel dashboard (rotated) |
| `ADMIN_EMAIL` | `autokitadmin@email.com` — unlocks /dashboard/analytics |

---

## Open Decisions

1. **Pro tier price**: $9/mo vs $12/mo vs $15/mo — not decided
2. **Script history storage**: Supabase table vs Vercel KV
3. **Pro gate**: hard block free users or soft-nudge CTA
4. **Custom domain**: taskpilot.dev (not yet set up)
5. **Pilot real photo**: user has pilot helmet image but hasn't copied to `public/pilot.png`
