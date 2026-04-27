# TaskPilot — Project Memory

## What this is
IT helpdesk automation business. Sells PowerShell automation scripts ($19 starter kit).
Also has a free AI script generator at `/generate` — users pick OS + environment, describe a task, and get a production-ready script. Powered by claude-sonnet-4-6.

## Stack
| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14 App Router, TypeScript | Strict mode, @/* path alias |
| UI | Tailwind CSS + shadcn/ui | Dark mode class strategy, brand tokens in tailwind.config.ts |
| Auth | Supabase Auth (magic link) | @supabase/ssr package |
| Database | Supabase PostgreSQL | RLS on all tables |
| Storage | Supabase Storage | Private bucket `products` for kit ZIP |
| Payments | Stripe Checkout (hosted) | Never touch card data → PCI SAQ A |
| Email | Resend | Custom HTML templates in src/emails/ |
| Hosting | Vercel | Auto-deploy from GitHub main branch |
| CI/CD | GitHub Actions | Gitleaks + CodeQL + build check + smoke test |
| AI Generation | Anthropic claude-sonnet-4-6 | Direct fetch (no SDK), server-side only |

## Commands
```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run typecheck # TypeScript validation
npm run lint      # ESLint
```

## Environment Variables (all required in Vercel)
```
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID
RESEND_API_KEY
RESEND_FROM_EMAIL
UNSUB_HMAC_SECRET
ADMIN_EMAIL
ANTHROPIC_API_KEY
```

## AI Script Generator (/generate)

- **Page**: `src/app/generate/page.tsx` (Server Component wrapper)
- **Wizard**: `src/components/generator/generator-wizard.tsx` (Client Component, all state here)
- **API**: `src/app/api/generate/route.ts` — calls Anthropic directly via fetch, returns `GenerateResult` JSON
- **Rate limit**: 10 generations/hour per IP (in-memory)
- **Flow**: OS → Environment (+ optional cloud providers) → Task description → AI generates or asks one clarifying question → result with script, explanation, config notes
- **Model**: `claude-sonnet-4-6` — quality over speed; 4096 max_tokens
- **Security**: API key server-side only; user input sanitized via Zod before reaching the prompt; user text isolated in the user message, never interpolated into system prompt
- **Clarification loop**: If Claude returns `needsClarification: true`, wizard shows the question and re-submits with the answer as a second turn
- **Download**: Client-side Blob download — no server involvement needed for the file itself

## Key architectural decisions

### Auth: getUser() not getSession()
Always use `supabase.auth.getUser()` in middleware and server components.
`getSession()` trusts the local cookie without server validation — insecure.

### Stripe webhook: raw body
The webhook route uses `await request.text()` — never parse with JSON middleware first.
Stripe signature verification requires the raw body.

### Download security
Supabase Storage bucket `products` is PRIVATE. We generate signed URLs (1hr TTL).
Dashboard query: `user_id = X OR email = Y` — covers guest buyers who later create accounts.

### GDPR deletion order
Send confirmation email FIRST (while user.email is available), then call
`db.auth.admin.deleteUser()` last — this invalidates the session.

### Rate limiting
In-memory Map-based limiter. Resets on cold starts (acceptable for MVP traffic).
Upgrade path: swap Map for Upstash Redis in lib/rate-limit.ts without changing call sites.

### Email unsubscribe tokens
HMAC-SHA256 signed, self-validating (no DB lookup needed).
Newsletter confirmation uses a DB-stored random 32-byte hex token instead (single-use).

## File structure
```
src/
  app/
    (marketing)/page.tsx     ← landing page
    (auth)/login/page.tsx    ← magic link login
    auth/callback/route.ts   ← Supabase auth exchange
    dashboard/               ← protected (middleware + layout guard)
    checkout/                ← Stripe session creation
    api/                     ← all API routes
  lib/
    supabase/{server,client,admin}.ts
    stripe.ts, resend.ts, tokens.ts, validations.ts, rate-limit.ts, utils.ts
  components/
    ui/, layout/, landing/, dashboard/
  emails/                    ← HTML email templates
supabase/schema.sql          ← run once in Supabase SQL editor
scripts/ps/                  ← the product being sold
```

## Deploy checklist
1. Run schema.sql in Supabase SQL editor
2. Create Stripe product ($19) → copy price ID
3. Configure Stripe webhook → copy signing secret
4. Add all 12 env vars in Vercel dashboard
5. Upload kit ZIP to Supabase Storage: bucket `products`, path `products/taskpilot-kit.zip`
6. Update STRIPE_PRICE_ID in database products table seed value
