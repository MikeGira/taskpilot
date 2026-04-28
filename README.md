# TaskPilot

> Put your IT on autopilot.

IT helpdesk automation platform — sells production-ready PowerShell scripts for solo IT admins and small teams, plus a free AI-powered script generator.

[![CI](https://github.com/MikeGira/taskpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/MikeGira/taskpilot/actions/workflows/ci.yml)

**Live:** https://taskpilot-umber.vercel.app

---

## Products

| Product | Price | What it is |
|---------|-------|-----------|
| Starter Kit | $19 one-time | 11 production scripts + config + scheduler + setup guide |
| AI Generator | Free | Generate any IT automation script for any OS + environment |
| Pro Generator | Coming soon | Unlimited generation + script history + download library |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14 App Router, TypeScript | Strict mode, @/* alias |
| UI | Tailwind CSS + shadcn/ui | True-black + colorful glows theme |
| Auth | Supabase Auth (magic link) | @supabase/ssr, getUser() only |
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
7. Pilot avatar: copy pilot image to `public/pilot.png` and push

---

## Security

- PCI DSS SAQ A — Stripe Checkout handles all card data
- GDPR — data export + deletion in account settings
- Gitleaks + CodeQL on every push
- Supabase RLS on all tables
- Rate limiting on all public API endpoints (IP-based)
- Input validation (Zod) on all routes
- HMAC-SHA256 signed unsubscribe tokens
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
