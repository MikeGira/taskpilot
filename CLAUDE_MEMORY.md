# TaskPilot — Claude Session Memory

_Last updated: 2026-04-28 — write this before every context compact_

---

## Current Task Status

**IN PROGRESS (next session picks up here):**
1. Build Pro Generator Tier (Option 2) — see PLAN.md for full spec
2. Build Dynamic Kit Builder (Option 3) — follows Option 2

**COMPLETED this session:**
- Full app built and deployed (see PROGRESS.md for checklist)
- Security fixes: rate limiting added to checkout, unsubscribe, confirm-subscription
- Download route: removed used-Set, backfills purchase record on every download
- Dashboard OR query fixed (empty userId broke PostgREST)
- Nav hover: spring cubic-bezier animation (real bounce effect)
- OS/env cards: brighter, Linux=yellow, all colors more solid
- Pilot AI: markdown stripping, stronger no-markdown system prompt
- Pilot image: loads /pilot.png with emoji fallback
- AnimatedArcs globe, AnimatedTerminal, HeroBeams, FadeInSection components
- Vercel-style black/white theme + Supabase-inspired colored glows

---

## Monetization Plan (PLAN.md has full spec)

### Option 2: Pro Generator Tier ← BUILD NEXT
- Free tier: 10 scripts/hour (current), no history
- Pro tier: $9–15/month unlimited, script history, download library
- Supabase table: `subscriptions` (user_id, plan, stripe_subscription_id, status)
- New Stripe product: recurring subscription (monthly)
- Gate the generator behind plan check in `/api/generate/route.ts`
- New pages: `/pricing` (update existing), `/dashboard/billing`
- Middleware update: check subscription status for Pro features

### Option 3: Dynamic Kit Builder ← AFTER Option 2
- User selects OS + environment + 5-7 script types
- AI generates a complete tailored ZIP with config + setup guide
- Charge $19–29 per kit (one-time, like current kit)
- New Stripe checkout flow for kit orders

---

## Recent Commits (last session)
```
478ec85 fix: download re-use, dashboard empty, nav spring, card brightness, Pilot markdown
634ae6d style: macOS traffic light buttons on terminal (red/yellow/green)
e3b8179 fix: download fallback paths, visibility, Pilot image+markdown, card colors
729ed18 feat: globe arcs animation, Pilot generates scripts, expanded script library
79bb220 feat: colorful animations, Pilot avatar, nav hover, before/after icons
d2f4599 feat: animations + Pilot AI assistant
f38abde fix: auth errors, download 500, subscribe network error, nav + buttons
```

---

## Critical Files Map
```
src/app/api/generate/route.ts          ← AI script generator API (claude-sonnet-4-6)
src/app/api/assistant/route.ts         ← Pilot chat API (claude-haiku-4-5)
src/app/api/download/session/route.ts  ← Post-purchase download (Stripe verify + signed URL)
src/app/api/webhook/stripe/route.ts    ← Stripe webhook (creates purchase records)
src/app/auth/callback/route.ts         ← Supabase magic link callback
src/middleware.ts                      ← Auth guard for /dashboard (excludes /api/)
src/components/assistant/chat-widget.tsx  ← Pilot floating chat + generate tab
src/components/animations/            ← HeroBeams, AnimatedTerminal, AnimatedArcs, FadeInSection
supabase/schema.sql                    ← Run once to create all tables + RLS
```

---

## Open Decisions
1. Pro tier pricing: $9/month vs $15/month vs $12/month
2. Script history storage: Supabase table (simple) vs Vercel KV (fast)
3. Pro gate: hard-block free users or soft-nudge with upgrade CTA
4. Dynamic kit (Option 3): generate server-side and store in Supabase Storage, or stream direct
5. STRIPE is still in TEST mode — must switch to live keys before real revenue

---

## Known Issues / Watch List
- Rate limiter is in-memory (resets on cold starts) — fine for MVP, upgrade to Upstash Redis when scaling
- Stripe still in test mode — switch `STRIPE_SECRET_KEY` to live key in Vercel when ready for real sales
- Pilot image: user needs to copy pilot helmet image to `public/pilot.png` and push
- The `/api/download/[product]` (dashboard download) and `/api/admin/improve-prompt` have no rate limit (auth-protected so lower risk)

---

## Environment (Vercel Production)
- URL: https://taskpilot-umber.vercel.app
- Supabase project: wexnhyfxmznwamyaopbx
- Stripe: test mode (sk_test_...)
- All 13 env vars confirmed set in Vercel dashboard
- SUPABASE_SERVICE_ROLE_KEY confirmed working

---

## How to Resume
1. Read this file first
2. Read PLAN.md for the Option 2 spec
3. Read CLAUDE.md for full architecture
4. Run `git log --oneline -5` to see latest commits
5. Start with: `src/app/api/generate/route.ts` to add subscription gating
