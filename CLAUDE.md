# TaskPilot — Project Memory

## What this is
IT helpdesk automation SaaS. Sells a PowerShell automation starter kit ($19). Free AI script
generator at `/generate` — users pick OS + environment, describe a task, get a production-ready
script. Admin analytics + AI-powered prompt improvement at `/dashboard/analytics`.

## Stack
| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14 App Router, TypeScript | Strict mode, @/* path alias |
| UI | Tailwind CSS + shadcn/ui | True-black + Supabase green (`#3ECF8E`) theme |
| Auth | Supabase Auth (magic link) | @supabase/ssr package |
| Database | Supabase PostgreSQL | RLS on all tables |
| Storage | Supabase Storage | Private bucket `products` for kit ZIP |
| Payments | Stripe Checkout (hosted) | Never touch card data → PCI SAQ A |
| Email | Resend (+ custom SMTP in Supabase) | Custom HTML templates in src/emails/ |
| Hosting | Vercel | Auto-deploy from GitHub main branch |
| CI/CD | GitHub Actions | Gitleaks + CodeQL + build check + smoke test |
| AI Generation | Anthropic claude-sonnet-4-6 | Direct fetch (no SDK), server-side only, 8192 max_tokens |

## Commands
```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run typecheck # TypeScript validation (run before every commit)
npm run lint      # ESLint
git push          # Triggers Vercel auto-deploy
```

## Environment Variables (all in Vercel dashboard + local .env)
```
NEXT_PUBLIC_SITE_URL          # https://taskpilot-umber.vercel.app
NEXT_PUBLIC_SUPABASE_URL      # https://wexnhyfxmznwamyaopbx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY             # sk_test_... (test mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID               # price_1TQtQj2...
RESEND_API_KEY
RESEND_FROM_EMAIL             # hello@blog.h0m3labs.store
UNSUB_HMAC_SECRET
ADMIN_EMAIL                   # autokitadmin@email.com
ANTHROPIC_API_KEY
```

## Supabase Configuration (dashboard settings)
- **Site URL**: `https://taskpilot-umber.vercel.app`
- **Redirect URLs**: `https://taskpilot-umber.vercel.app/**`
- **Custom SMTP**: smtp.resend.com / port 465 / user: resend / from: hello@blog.h0m3labs.store
- **Storage bucket**: `products` (PRIVATE) — path: `products/taskpilot-kit.zip`

## API Routes
| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/generate` | POST | None | AI script generation (rate limited 10/hr/IP) |
| `/api/generate/feedback` | POST | None | Save 👍/👎 rating, email admin (5/hr/IP) |
| `/api/admin/improve-prompt` | POST | Admin only | Claude analyzes negative feedback → prompt suggestions |
| `/api/checkout` | POST | None | Create Stripe checkout session |
| `/api/webhook/stripe` | POST | Stripe sig | Handle purchase → create purchase record + send email |
| `/api/download/[product]` | GET | Auth | Generate signed Supabase Storage URL |

## AI Script Generator (/generate)

- **Page**: `src/app/generate/page.tsx`
- **Wizard**: `src/components/generator/generator-wizard.tsx` (all client state)
- **API**: `src/app/api/generate/route.ts` — calls Anthropic via fetch, returns `GenerateResult` JSON
- **Rate limit**: 10 generations/hour per IP (in-memory Map, resets on cold start)
- **max_tokens**: 8192 — raised from 4096 to handle long scripts without truncation
- **JSON parsing**: `extractJson()` strips markdown fences + fixes literal newlines in strings
- **Clarification loop**: If Claude returns `needsClarification: true`, wizard shows the question,
  re-submits with the answer appended, then generates
- **Feedback**: After generation, 👍/👎 widget → saves to `generation_feedback` table + emails admin

## Feedback & Analytics System
- **Table**: `generation_feedback` (os, environment, language, rating, comment, ip_hash, created_at)
- **Admin page**: `/dashboard/analytics` — visible only when `user.email === ADMIN_EMAIL`
- **AI improvement**: "Analyze Feedback" button calls `/api/admin/improve-prompt` → Claude returns
  patterns + specific prompt text changes with priority levels
- **Workflow**: review analytics → click Analyze → copy suggested text → paste into
  `src/app/api/generate/route.ts` `buildSystemPrompt()` → commit + push → Vercel redeploys

## Key Architectural Decisions

### Auth: getUser() not getSession()
Always use `supabase.auth.getUser()` in middleware and server components.
`getSession()` trusts the local cookie without server validation — insecure.

### Stripe webhook: raw body
The webhook route uses `await request.text()` — never parse with JSON middleware first.
Stripe signature verification requires the raw body.

### Download security
Supabase Storage bucket `products` is PRIVATE. Signed URLs (1hr TTL).
Dashboard query: `user_id = X OR email = Y` — covers guest buyers who later create accounts.

### GDPR deletion order
Send confirmation email FIRST (while user.email is available), then call
`db.auth.admin.deleteUser()` last — this invalidates the session.

### JSON parsing resilience
Claude sometimes returns JSON wrapped in ``` fences or with literal newlines in string values.
`extractJson()` in generate/route.ts strips fences first, then tries JSON.parse; if that fails,
`fixLiteralNewlinesInJsonStrings()` re-encodes using a character-by-character pass.

## File Structure
```
src/
  app/
    (marketing)/page.tsx          ← landing page
    (auth)/login/page.tsx         ← magic link login
    auth/callback/route.ts        ← Supabase auth exchange
    generate/page.tsx             ← script generator page
    dashboard/
      page.tsx                    ← downloads (protected)
      analytics/page.tsx          ← admin analytics (ADMIN_EMAIL only)
      account/page.tsx            ← account settings
    checkout/                     ← Stripe session creation
    api/
      generate/route.ts           ← AI script generation
      generate/feedback/route.ts  ← feedback collection
      admin/improve-prompt/route.ts ← AI prompt analysis
    icon.tsx                      ← favicon (edge runtime, 32x32 PNG)
  lib/
    supabase/{server,client,admin}.ts
    stripe.ts, resend.ts, tokens.ts, validations.ts, rate-limit.ts, utils.ts
  components/
    ui/                           ← shadcn primitives (button, input, textarea, card)
    layout/                       ← navbar, footer
    landing/                      ← hero, features, pricing, contact-form
    dashboard/                    ← download-card, sign-out-button, analytics-client
    generator/                    ← generator-wizard
  emails/                         ← HTML email templates
supabase/schema.sql               ← run once in Supabase SQL editor
scripts/ps/                       ← the product being sold (7 PowerShell scripts)
```

## Theme
- Background: `#000000` (true black, Vercel-style)
- Surfaces/cards: `#0D0D0D`
- Primary accent: `emerald-400/500` ≈ Supabase green `#3ECF8E`
- Text: `#F9FAFB` primary, `#9CA3AF` secondary, `#6B7280` muted
- Favicon: terminal `>_` icon in green on black, generated via `src/app/icon.tsx`

## Deploy Checklist (completed ✓)
- [x] Run schema.sql in Supabase SQL editor
- [x] Run generation_feedback table SQL
- [x] Create Stripe product ($19) → price ID configured
- [x] Configure Stripe webhook → signing secret set
- [x] Add all 13 env vars in Vercel dashboard
- [x] Upload kit ZIP: bucket `products`, path `products/taskpilot-kit.zip`
- [x] Set Supabase Site URL + redirect URLs to production domain
- [x] Configure Resend SMTP in Supabase for branded auth emails
