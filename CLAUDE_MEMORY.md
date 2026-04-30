# TaskPilot — Claude Session Memory

_Last updated: 2026-04-30 (third major session)_
_Resume guide: read this file → PLAN.md → CLAUDE.md → `git log --oneline -10`_

---

## Current Status: LIVE, SECURE & NEARLY LAUNCH-READY ✅

**URL:** https://taskpilot-umber.vercel.app
**Repo:** https://github.com/MikeGira/taskpilot (public)
**Stripe:** TEST mode — see URGENT section below before going live
**Admin email:** autokitadmin@gmail.com (confirmed working)
**Last commits:** security audit fixes, password auth, globe animation, dot grid, visual polish

---

## URGENT — Two Manual Actions Required Before Launch

### 1. Fix Stripe Webhook + Rebuild ZIP
These were flagged in the previous session and are STILL pending (require user action, not code):

**Fix webhook:**
```bash
npm run setup:webhook
```
Update `STRIPE_WEBHOOK_SECRET` in Vercel after running.

**Rebuild ZIP:**
Zip all files in `scripts/ps/` (9 scripts) → upload to Supabase Storage → `products/taskpilot-kit.zip` (replace old 4-script version).

### 2. Switch Stripe to Live Mode (when ready for real revenue)
1. Stripe Dashboard → Test → Live toggle
2. Developers → API Keys → copy `pk_live_...` and `sk_live_...`
3. Create live product → $19 → copy `price_live_...`
4. Update Vercel: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID`
5. Redeploy → run `npm run setup:webhook` → get new `whsec_live_...` → update `STRIPE_WEBHOOK_SECRET` → redeploy again

---

## What Was Done This Session (2026-04-30)

### Visual / UI
- Dot grid pattern — defined `bg-grid-pattern` (hero) and `bg-grid-pattern-subtle` (secondary sections)
- Dot grid applied to: hero, "How it works", Pricing, Newsletter, Login page (with radial mask to clear card area), Generator header already had it
- Opacity raised to 22% / 11% with section glows to make dots visible
- Center spotlight in hero (street light from above effect)
- Gradient headline "Start automating it." (indigo→cyan→emerald)
- Trust icon strip below hero CTAs
- Metrics bar in hero (9 scripts / < 1hr / $19 / ∞)
- Pricing card: indigo glow, accent top line, colored border, emerald checkmarks
- CTA button white glow on hover
- Environment cards: Linux→yellow, Cloud→emerald, brighter borders
- Nav hover spring animation cleaned up (scale 0.82, no translateY, 0.28s cubic bezier)
- Pilot button: replaced 👨‍✈️ emoji with pilot.svg (matches panel header)

### Globe Animation (AnimatedArcs)
- Rewrote twice: first to hemisphere dome (abandoned — looked unfinished in 2-col layout), then to full rotating globe
- Final version: elevation-angle orthographic projection (latitude rings bow inward = 3D), 7 lat rings, 7 meridians, 9 animated arcs spanning full globe including southern hemisphere, 12 triangle node markers
- Slow self-rotation: 0.15°/50ms = 3°/s = 1 revolution per ~2 minutes. Only meridians and nodes rotate; latitude rings fixed (identical when rotated)

### Authentication
- Login page: tab switcher (Password | Magic link), password is default tab, show/hide password toggle
- Password sign-in uses `signInWithPassword`, on success `router.push + router.refresh()`
- Account page: new "Password" card with `ChangePasswordForm` client component using `supabase.auth.updateUser({ password })`
- Auth callback: handles both `token_hash` (OTP flow) and `code` (PKCE flow) — fixes cross-browser magic link failures

### Security Audit (2026-04-30)
Fixed 6 issues:
1. IP spoofing: `x-real-ip` now prioritised over `x-forwarded-for` in `getClientIp()`
2. XSS in admin feedback emails: HTML-escape `language`, `os`, `environment`, `comment`
3. XSS in GDPR data export: `esc()` function applied to all user data in HTML output
4. No rate limiting on `/api/admin/improve-prompt`: added 10/hr per user ID
5. No rate limiting on `/api/account/export`: added 5/hr per user ID
6. `productSlug` now `z.enum(['it-helpdesk-starter-kit'])` instead of open string

Added `X-XSS-Protection: 1; mode=block` header in `next.config.mjs`.

NOT fixed (post-launch):
- Next.js 14.2.35 CVEs: mitigated by config (no `rewrites`, no `remotePatterns`)
- In-memory rate limiter: upgrade to Upstash Redis when scaling

### Pilot Panel
- Copy/Download buttons now in a STICKY bar at the top of the result panel (never scrolls away with long config notes)
- 👍/👎 feedback widget added to Pilot generate result (same API as main generator)
- Copy button: shows visual feedback after clipboard write, not before
- Download: `application/octet-stream` MIME type forces download instead of opening in browser

### Other Fixes
- `analytics/page.tsx` admin check: `ADMIN_EMAIL` was `autokitadmin@email.com`, corrected to `autokitadmin@gmail.com`
- Forced empty commit to ensure Vercel rebuild picks up env var change
- `bg-grid-pattern` previously referenced but undefined in CSS — now properly defined

---

## What's Fully Built

### Core Product
- Landing page: hero spotlight, dot grid, gradient headline, metrics bar, trust strip, animated globe
- 9 PowerShell scripts in `scripts/ps/`
- Stripe checkout (TEST mode), magic link + password auth, dashboard downloads
- Supabase Storage: `products/taskpilot-kit.zip` (NEEDS REBUILD with 9 scripts)
- Account: GDPR export (HTML), account deletion, newsletter unsub, set/change password

### AI Script Generator (/generate)
- 3-step wizard: OS → Environment (+cloud providers) → Task
- Clarification loop, robust JSON parser, feedback widget
- Rate limiting: 10/hr per IP, max_tokens: 16384
- Null-script error state: shows error, not misleading success

### Pilot AI Assistant
- Floating widget: Ask Pilot tab + Generate Script tab
- Sticky Copy/Download bar in result step (always visible)
- Thumbs up/down feedback → same Supabase table as main generator
- System prompt: no em-dashes, no markdown, no affirmation openers

### Dashboard
- Downloads, Account (password form, data export, GDPR delete), Analytics (admin only)
- Mobile bottom tab nav with active state

### Security (post-audit state)
- Rate limiting on ALL public endpoints, x-real-ip spoofing prevention
- Zod validation + productSlug allowlist
- HTML-escaping on all user data in emails and HTML output
- Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy

---

## What's Next (priority order)

### Pre-Launch (user action required)
1. Run `npm run setup:webhook` → update STRIPE_WEBHOOK_SECRET in Vercel
2. Rebuild and re-upload kit ZIP (9 scripts) to Supabase Storage
3. Switch Stripe to live mode (see steps above)
4. Test full purchase flow with real card

### Post-Launch
5. Upgrade Next.js 14 → 15 (CVE mitigation, breaking changes need careful testing)
6. Upgrade in-memory rate limiter to Upstash Redis (needed at scale)
7. Pro Generator Tier — full spec in PLAN.md (SQL ready, file specs ready)
8. Dynamic Kit Builder (Option 3 in PLAN.md)

---

## Critical File Map

```
src/app/api/generate/route.ts              ← claude-sonnet-4-6, 16384 max_tokens
src/app/api/assistant/route.ts             ← claude-haiku-4-5, 800 max_tokens
src/app/api/download/session/route.ts      ← post-purchase download + email fallback
src/app/api/download/[product]/route.ts    ← dashboard download (server-side signed URL)
src/app/api/webhook/stripe/route.ts        ← Stripe webhook (purchase + email)
src/app/auth/callback/route.ts             ← handles both token_hash and code flows
src/middleware.ts                          ← auth guard, getUser() not getSession()
src/lib/rate-limit.ts                      ← x-real-ip priority (spoofing protected)
src/lib/validations.ts                     ← productSlug z.enum allowlist
src/components/assistant/chat-widget.tsx   ← Pilot (sticky Copy/Download, feedback)
src/components/animations/animated-arcs.tsx ← rotating globe (elevation projection)
src/components/dashboard/change-password-form.tsx ← set/change password
src/app/(auth)/login/page.tsx              ← tab switcher: Password | Magic link
src/app/dashboard/account/page.tsx        ← includes ChangePasswordForm
next.config.mjs                           ← all security headers including X-XSS-Protection
```

---

## Environment

| Key | Value / Location |
|-----|-----------------|
| `NEXT_PUBLIC_SITE_URL` | https://taskpilot-umber.vercel.app |
| `SUPABASE_SERVICE_ROLE_KEY` | In Vercel dashboard |
| `STRIPE_SECRET_KEY` | Test key (`sk_test_...`) — switch to live before launch |
| `STRIPE_WEBHOOK_SECRET` | **NEEDS UPDATE** after running setup:webhook |
| `ANTHROPIC_API_KEY` | In Vercel dashboard |
| `ADMIN_EMAIL` | `autokitadmin@gmail.com` — confirmed working 2026-04-30 |

---

## Known Issues / Watch List

| Issue | Status | Fix |
|-------|--------|-----|
| Stripe webhook URL wrong | **URGENT** | Run `npm run setup:webhook`, update STRIPE_WEBHOOK_SECRET |
| Kit ZIP has 4 scripts | **URGENT** | Rebuild from scripts/ps/, re-upload to Supabase |
| Stripe in TEST mode | Open | Switch to live keys when ready |
| Rate limiter in-memory | Post-launch | Upgrade to Upstash Redis |
| Next.js 14 CVEs | Post-launch | Mitigated by config; upgrade to v15 in new session |
