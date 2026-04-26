# TaskPilot

> Put your IT on autopilot.

IT helpdesk automation platform — sells production-ready PowerShell scripts for solo IT admins and small teams.

[![CI](https://github.com/MikeGira/taskpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/MikeGira/taskpilot/actions/workflows/ci.yml)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| UI | Tailwind CSS + shadcn/ui |
| Auth | Supabase Auth (magic link) |
| Database | Supabase PostgreSQL + RLS |
| Storage | Supabase Storage (private) |
| Payments | Stripe Checkout (hosted) |
| Email | Resend |
| Hosting | Vercel |

## Local Development

```bash
# 1. Clone the repo
git clone https://github.com/MikeGira/taskpilot.git
cd taskpilot

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env.local
# Fill in all values in .env.local

# 4. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

See `CLAUDE.md` for the full deploy checklist. The short version:

1. Create Supabase project → run `supabase/schema.sql`
2. Create Stripe product ($19) and webhook
3. Add all env vars in Vercel dashboard
4. Import GitHub repo to Vercel → auto-deploys on push to `main`
5. Upload kit ZIP to Supabase Storage (`products/taskpilot-kit.zip`)

## Environment Variables

See `.env.example` for all required variables with documentation.

## Security

- PCI DSS SAQ A compliant — Stripe Checkout handles all card data
- GDPR compliant — data export/deletion in user dashboard
- Gitleaks + CodeQL run on every push
- Supabase RLS on all tables
- HMAC-signed unsubscribe tokens
- Security headers via `next.config.ts`
