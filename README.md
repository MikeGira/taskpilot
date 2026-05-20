# TaskPilot

> Put your IT on autopilot.

IT helpdesk automation platform for solo IT admins and small teams. Sell production-ready PowerShell scripts, generate custom automation scripts with AI, and build n8n workflows from plain English — all free to try, no account required.

[![CI](https://github.com/MikeGira/taskpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/MikeGira/taskpilot/actions/workflows/ci.yml)

**Live:** https://taskpilot-umber.vercel.app

---

## Products

| Product | Price | What it is |
|---------|-------|-----------|
| Starter Kit | $19 one-time | 9 production-ready PowerShell scripts + config.json + scheduler.xml + setup guide |
| AI Script Generator | Free | Generate any IT automation script for any OS + tool — no account needed. Downloads script + setup guide. |
| n8n Workflow Generator | Free | Describe your automation in plain English, get import-ready n8n workflow JSON + setup guide instantly. |
| Pilot AI Assistant | Free | Built-in AI co-pilot — answers platform questions, helps write task descriptions, guides you to the right generator. |
| Pro Generator | Coming soon | Unlimited generation + script history + download library |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14 App Router, TypeScript | Strict mode, @/* alias — upgrade to 16 pending |
| UI | Tailwind CSS + shadcn/ui | True-black + colorful glows theme |
| Auth | Supabase Auth (magic link + password) | @supabase/ssr, getUser() only |
| Database | Supabase PostgreSQL | RLS on all tables |
| Storage | Supabase Storage | Private `products` bucket |
| Payments | Stripe Checkout (hosted) | PCI SAQ A — never touch card data |
| Email | Resend | Custom SMTP in Supabase for branded magic links |
| Hosting | Vercel | Auto-deploy from GitHub main |
| CI/CD | GitHub Actions | Gitleaks + CodeQL + build check |
| AI | Anthropic claude-sonnet-4-6 | Script generator (direct fetch, server-side only) |
| AI Chat | Anthropic claude-haiku-4-5 | Pilot assistant (rate limited 30/hr/IP) |

---

## Local Development

```bash
git clone https://github.com/MikeGira/taskpilot.git
cd taskpilot
npm install
cp .env.example .env   # fill in all 13 values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

All 13 are required. See `.env.example` for documentation. Key ones:

```
SUPABASE_SERVICE_ROLE_KEY   ← service role key (not anon key) — needed for server-side DB ops
ANTHROPIC_API_KEY           ← powers /generate and Pilot AI
STRIPE_WEBHOOK_SECRET       ← verify webhook signatures
ADMIN_EMAIL                 ← receives feedback alerts + unlocks /dashboard/analytics
```

---

## Deployment Checklist

Full checklist in `CLAUDE.md`. Summary:

1. Supabase: create project → run `supabase/schema.sql` → run `generation_feedback` table SQL
2. Stripe: create $19 product → copy price ID → configure webhook endpoint
3. Vercel: add all 13 env vars → import GitHub repo (auto-deploys on push)
4. Supabase Storage: upload kit ZIP to `products` bucket as `taskpilot-kit.zip`
5. Supabase Auth: set Site URL + redirect URLs to production domain
6. Resend SMTP in Supabase: host `smtp.resend.com`, port 465, username `resend`
7. Run `npm run setup:webhook` after Stripe is configured to fix the webhook URL and signing secret

---

## Security

- PCI DSS SAQ A — Stripe Checkout handles all card data
- GDPR — data export + deletion in account settings
- Gitleaks + CodeQL on every push
- Supabase RLS on all tables
- Rate limiting on all public API endpoints (IP-based, x-real-ip spoofing protected)
- Input validation (Zod) on all routes, productSlug restricted to known enum
- HMAC-SHA256 signed unsubscribe tokens
- HTML-escaping on all user input rendered in email/HTML output
- X-XSS-Protection, X-Content-Type-Options, X-Frame-Options headers
- Middleware excludes /api/ routes (API routes handle their own auth)

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Full architecture reference |
| `CLAUDE_MEMORY.md` | Session state — what's done, what's next |
| `PLAN.md` | Monetization roadmap (Pro tier + Dynamic Kit Builder) |
| `PROGRESS.md` | Build checklist and known issues |
| `supabase/schema.sql` | All tables + RLS policies (run once) |
