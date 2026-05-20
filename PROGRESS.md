# TaskPilot — Session Progress

_Last updated: 2026-05-20_

## Current Status: LIVE & FIRST SALE ✅

The app is live at **https://taskpilot-umber.vercel.app**

### Milestone: First real purchase confirmed
- Stripe switched from test mode → **live production** ✅
- First real purchase made by Mike (founder) using a personal credit card ✅
- Payment received in bank account ✅
- Transaction visible in Stripe live dashboard ✅
- Stripe live keys deployed to Vercel ✅

## What's Built & Working

### Core Product
- [x] Landing page with pricing, features, FAQ
- [x] Stripe checkout ($19 starter kit, test mode)
- [x] Supabase Auth (magic link login)
- [x] Protected dashboard with download (signed URL from private bucket)
- [x] Supabase Storage: `products` bucket, `products/taskpilot-kit.zip` uploaded
- [x] Account management + GDPR-compliant deletion
- [x] Email notifications via Resend (purchase confirmation, magic link)
- [x] Newsletter signup + HMAC unsubscribe tokens

### AI Script Generator (/generate)
- [x] 4-step wizard: OS → Environment → Tool → Task description
- [x] OS options: Windows, Linux, macOS, Cross-Platform
- [x] Environment options: On-Prem, Hybrid, Cloud, Multi-Cloud
- [x] Cloud sub-selection: AWS, Azure, GCP, DigitalOcean, Linode, Supabase
- [x] 27 tool/language options across 10 categories
- [x] Clarification loop (Claude asks 1 question if needed, then generates)
- [x] Download produces TWO files: script + setup guide .md
- [x] Copy to clipboard
- [x] Config notes ("Before you run" section)
- [x] Rate limiting: 10/hr per IP
- [x] Robust JSON parsing (handles markdown fences + literal newlines)

### n8n Workflow Generator (/workflow)
- [x] 3-step wizard: Trigger → Integrations → Description
- [x] 6 trigger types: Webhook, Schedule, Manual, Email, Form, Database
- [x] 30+ integrations (Slack, GitHub, Notion, Stripe, Claude AI, etc.)
- [x] 3 complexity levels: Simple / Standard / Complex
- [x] Node diagram preview
- [x] Credentials required section
- [x] Import instructions
- [x] Download produces TWO files: workflow.json + setup guide .md
- [x] Rate limiting: 10/hr per IP

### Pilot AI Assistant (floating widget, all pages)
- [x] Chat panel: answers platform questions, guides to generators
- [x] Generate Script panel: inline 4-step script wizard
- [x] Download produces TWO files matching main page behavior
- [x] Prompt injection detection
- [x] Rate limiting: 30/hr per IP
- [x] Powered by Claude Haiku

### Feedback & Analytics (admin only)
- [x] 👍/👎 feedback widget on result step
- [x] Feedback saved to `generation_feedback` Supabase table
- [x] Email alert to admin on every rating submission
- [x] `/dashboard/analytics` — satisfaction stats, breakdowns by OS/env/language
- [x] "Analyze Feedback" → Claude analyzes negative ratings → returns prompt improvements
- [x] Analytics nav link visible only to admin (ADMIN_EMAIL check)

### Infrastructure
- [x] CI/CD: GitHub Actions (Gitleaks + CodeQL + build)
- [x] Vercel auto-deploy on push to main
- [x] `.env.example` has placeholder values only (real secrets in .env + Vercel)

## Pending / In Progress

### Testing (in progress)
- [ ] End-to-end purchase flow (Stripe test card 4242 4242 4242 4242)
- [ ] Magic link → redirect to production URL (fix applied to Supabase config)
- [x] Script generator tested (JSON parse error fixed 2026-04-28)
- [ ] Full download flow after purchase
- [ ] Feedback widget → email received by admin

### Not Yet Done
- [x] Switch Stripe from test mode → live mode ✅ done 2026-05-13
- [ ] App rename — "TaskPilot" name conflict with taskpilot.app (NZ field team mgmt). Name change required before LinkedIn launch.
- [ ] Custom domain (after rename is decided)
- [ ] Next.js 14 → 16 upgrade (plan documented in memory, all changes mapped)
- [ ] Marketing: LinkedIn launch post (ready, waiting on rename), Product Hunt, Reddit r/sysadmin

## Recent Changes (this session)

| Commit | What changed |
|--------|-------------|
| `241e3ab` | Fix JSON parsing — strip code fences, fix literal newlines, raise max_tokens to 8192 |
| `c88734a` | Add feedback system, email alerts, analytics page, AI prompt improvement |
| `8e4a09b` | Security: clean .env.example (remove exposed keys, already rotated) |
| `55e88b6` | AI script generator (/generate) |
| `3015180` | Initial build |

## How to Resume After a New Session

1. Read `CLAUDE.md` — full architecture reference
2. Read this file — current status
3. Run `git log --oneline -5` — most recent changes
4. Check Vercel dashboard for any failed deploys
5. Continue with: testing the full purchase flow end-to-end

## Known Issues / Watch Out For

- **Stripe is in TEST mode** — real purchases won't work until switched to live keys
- **Rate limiter is in-memory** — resets on Vercel cold starts. Fine for MVP, upgrade to
  Upstash Redis when traffic grows (swap in `lib/rate-limit.ts`)
- **ADMIN_EMAIL** must match exactly what's in Vercel env vars for analytics to appear
- **Supabase SMTP**: custom SMTP must be configured for branded magic link emails
  (smtp.resend.com / port 465 / user: resend / pass: RESEND_API_KEY)
