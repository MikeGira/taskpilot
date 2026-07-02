# TaskPilot — Project Memory

## What this is
IT helpdesk automation SaaS. Sells a PowerShell automation starter kit ($19). Free AI script
generator at `/generate` — users pick OS + environment, describe a task, get a production-ready
script. Admin analytics + AI-powered prompt improvement at `/dashboard/analytics`.

## Stack
| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 15 App Router, TypeScript | Strict mode, @/* path alias |
| UI | Tailwind CSS + shadcn/ui | True-black + Supabase green (`#3ECF8E`) theme |
| Auth | Supabase Auth (magic link + password) | @supabase/ssr package |
| Database | Supabase PostgreSQL | RLS on all tables |
| Storage | Supabase Storage | Private bucket `products` for kit ZIP |
| Payments | Stripe Checkout (hosted) | Never touch card data → PCI SAQ A |
| Email | Resend (+ custom SMTP in Supabase) | Custom HTML templates in src/emails/ |
| Hosting | Vercel | Auto-deploy from GitHub main branch |
| CI/CD | GitHub Actions | Gitleaks + CodeQL + build check + smoke test |
| AI Generation | Anthropic claude-sonnet-4-6 | Direct fetch (no SDK), server-side only, 16384 max_tokens |
| AI Chat | Anthropic claude-haiku-4-5-20251001 | Pilot assistant, 800 max_tokens, 30/hr/IP rate limit |

## Commands
```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run typecheck # TypeScript validation (run before every commit)
npm run lint      # ESLint
git push          # Triggers Vercel auto-deploy
```

## Local Dev Loop Checks

Use `/loop` in Claude Code to run a check repeatedly while you work. Stop by sending any message.

```bash
# TypeScript errors in real-time (~3s per run, fastest signal)
/loop 30s npm run typecheck

# Lint violations during refactoring
/loop 45s npm run lint

# Dev server liveness while working on API routes
/loop 60s curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000
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
ADMIN_EMAIL                   # autokitadmin@gmail.com — unlocks /dashboard/analytics
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

## Card Hover System (Bio-grade, 3-tier)

All cards use the `--card-hover-border` (`rgba(62,207,142,0.40)`) and `--card-hover-glow` CSS variables. Override per-card with inline `style`.

| Class | Bio equivalent | Behavior | Use for |
|-------|---------------|----------|---------|
| `card-cta` + `data-spring` | `.proj-card` | Top-bar slide + `-3px` lift + spring + Dynamic Island click | Pricing, Newsletter, Contact, Download, any card with a button/form CTA |
| `card-glow` | `.impact-card` | Top-bar slide + `-4px` lift + glow | Non-CTA informational cards (Steps, Before/After, Analytics, Profile, Terminal) |
| `card-info` | `.exp-card` | `-2px` lift + border + glow, no top-bar | FAQ cards, simple informational cards |
| `card-lift` + `data-spring` | `.proj-card` (link wrapper) | Top-bar slide + spring lift + glow | Link wrappers around Card component (script cards) |
| `card-lift-snap` + `data-spring` | `.proj-card` (direct) | Top-bar slide + snap lift + glow | Direct link elements that ARE the card (free tool cards) |
| `card-top-bar` | — | Top-bar only (no lift/border override) | Cards with own inline hover styles (n8n card) |

Per-card color override:
```tsx
style={{ '--card-hover-border': 'rgba(99,102,241,0.60)', '--card-top-bar': 'rgba(129,140,248,0.90)' } as CSSProperties}
```
Dynamic Island spring is handled by `CardSpringProvider` in layout.tsx — it listens for `click` on any `data-spring` element.

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

## CI & Workflow Gotchas (learned 2026-06-08)

Diagnose with the real tools, never by eyeballing YAML. `actionlint` and `gitleaks`
binaries are the source of truth — a wrong eyeball guess (e.g. blaming an `on:` event
when the real fault is YAML indentation) wastes a cycle.

- **`run: |` block scalars** — every line of a multi-line shell string (heredoc bodies,
  multi-line `git commit -m "..."`) must stay indented at/under the block scalar. A line
  at column 0 terminates the YAML block; the parser then reads prose as a key and the
  whole workflow fails to compile → **0-second startup failure**, friendly `name:`
  shows as the raw file path, and it **never runs** (not even on `schedule`). Prefer the
  injection-safe `env: BODY: |` pattern + `--body "$BODY"` over `$(cat <<'EOF' ...)`.
- **Trigger events are a short allowlist.** `member` and `repository` are valid *webhook*
  events but are **not** valid workflow `on:` triggers. There is no Actions trigger for
  "collaborator added." Check the canonical "events that trigger workflows" page, not the
  webhooks page.
- **gitleaks `paths` are regexes, not globs.** `*.example` is an invalid regex and panics
  gitleaks ≥ 8.30 (older versions tolerated it). Use `.*\.example$`.
- **gitleaks scan scope differs by event** — `gitleaks-action` scans only the **incremental
  diff** on `push`/`pull_request`, but the **full history** (`git log -p --full-history --all`)
  on `schedule`/`workflow_dispatch`. So a false positive in an *old, unchanged* line passes every
  PR yet fails the weekly Monday run. Diagnose a "CI suddenly red on schedule" by the event type
  in the job log, not the latest commit. (`workflow_dispatch` is on `ci.yml` for on-demand
  full-history scans.)
- **gitleaks placeholder false positives** — the `generic-api-key` rule captures the token only
  up to the first `.` (charset excludes `.`), so for a JWT-shaped stub like
  `eyJhbG….placeholder` the captured match is `eyJhbGc…` and the word "placeholder" (after the
  `.`) is **never seen** — so `regexTarget = "match"` + `(?i)placeholder` does **not** suppress it
  (it only works when "placeholder" is *inside* the token, e.g. `pk_test_placeholder`). For a
  reviewed historical finding, allowlist the exact **fingerprint** in `.gitleaksignore`
  (`commit:file:rule:line`) — surgical and immutable — rather than widening a `.gitleaks.toml`
  allowlist or rewriting history. Keep build-step env placeholders low-entropy and non-JWT-shaped.
- **Local pre-commit secret gate** — `.git/hooks/` is not version-controlled; on a fresh clone
  reinstall the gitleaks pre-commit hook (`gitleaks protect --staged`) so secrets are blocked
  before they reach history (rotation can't undo a value already committed). Needs the `gitleaks`
  binary on PATH (`~/bin` or `choco install gitleaks`).
- **Prevention now in CI**: the `workflow-lint` job in `ci.yml` runs `actionlint` on every
  PR, so invalid workflow YAML is blocked before it can reach main as a startup failure.
- **Stripe webhook**: ack every verified event with 200 (prevents Stripe retries); only
  *act* on handled types and `console.log` unhandled ones — never silently drop them.
