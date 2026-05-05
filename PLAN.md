# TaskPilot — Monetization Roadmap

## Option 1: Streaming Script Generation (REQUIRED BEFORE PRO TIER)

### Problem
The generator calls Anthropic synchronously and waits for the full response before returning.
Complex scripts (500–1100+ lines) take 60–150 seconds to generate. The current `maxDuration = 300`
buys time on Vercel Pro, but Hobby plan caps at 60s. Users on any plan see a spinner with no
feedback until the full script arrives. Streaming fixes both issues.

### Solution
Stream tokens from Anthropic directly to the browser as they are generated.
- User sees the script building in real time (no long spinner)
- Connection stays alive — no function timeout for long scripts
- Works on any Vercel plan

### Implementation Plan

**Backend (`src/app/api/generate/route.ts`):**
1. Add `stream: true` to the Anthropic request body
2. Return a `ReadableStream` response instead of `NextResponse.json()`
3. Pipe Anthropic SSE chunks to the client stream
4. Signal stream end by sending a final `data: [DONE]` SSE event

**Frontend (`src/components/generator/generator-wizard.tsx` + `chat-widget.tsx`):**
1. Replace `fetch + await res.json()` with an SSE reader that consumes the stream
2. Accumulate token chunks as they arrive — display live script preview in the code block
3. On stream end, parse the complete accumulated text with `extractJson()`
4. Transition to result step as normal

**Estimated effort:** 2–3 days  
**Impact:** Removes the timeout ceiling entirely — scripts of any length become possible

---

## Option 2: Pro Generator Tier (BUILD NEXT)

### Goal
Turn the free AI Script Generator into a freemium product with a paid Pro tier.

### Pricing
- Free: 10 scripts/hour per IP, no history, no account required
- Pro: $12/month (or $99/year) — unlimited generations, script history, download library

### Database Changes
Run in Supabase SQL editor:
```sql
CREATE TABLE public.subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id    TEXT,
  plan                  TEXT NOT NULL DEFAULT 'pro' CHECK (plan IN ('pro', 'team')),
  status                TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_end    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.generated_scripts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  os              TEXT NOT NULL,
  environment     TEXT NOT NULL,
  task_description TEXT NOT NULL,
  title           TEXT,
  filename        TEXT,
  language        TEXT,
  script          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_subscription" ON public.subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_scripts" ON public.generated_scripts FOR ALL USING (auth.uid() = user_id);
```

### Stripe Setup
1. Create a new Stripe product: "TaskPilot Pro"
2. Add a recurring price: $12/month (USD)
3. Add env var: `STRIPE_PRO_PRICE_ID=price_xxx`
4. Add webhook events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

### New Files to Create
```
src/app/api/subscription/create/route.ts   ← create Stripe subscription checkout
src/app/api/subscription/portal/route.ts   ← Stripe customer portal (manage/cancel)
src/app/api/webhook/stripe/route.ts        ← UPDATE: handle subscription events
src/app/dashboard/billing/page.tsx         ← billing management page
src/lib/subscription.ts                    ← helper: checkUserPlan(userId)
```

### Files to Modify
```
src/app/api/generate/route.ts              ← gate unlimited usage behind Pro check
src/app/(marketing)/page.tsx               ← update pricing section with Free/Pro tiers
src/app/dashboard/layout.tsx               ← add Billing nav link
```

### Generator Gating Logic (in /api/generate/route.ts)
```typescript
// After Zod validation, before calling Anthropic:
const isPro = await checkUserPlan(request); // reads cookie session
if (!isPro) {
  // Apply IP rate limit (existing behavior)
} else {
  // No rate limit — apply per-user limit instead (e.g., 500/day)
  // After generation, save to generated_scripts table
}
```

### Dashboard Billing Page
- Show current plan (Free / Pro)
- "Upgrade to Pro" button → creates Stripe checkout session
- "Manage subscription" button → Stripe Customer Portal
- "Script History" section (Pro only) → lists generated_scripts

---

## Option 3: Dynamic Kit Builder (AFTER Option 2)

### Goal
Replace the static $19 ZIP with a custom-generated kit tailored to the buyer's environment.

### Flow
1. User visits `/build` (new page)
2. Selects: OS, Environment, Cloud providers
3. Selects: 5–10 script types from a menu (password reset, onboarding, offboarding, etc.)
4. Preview summary shown
5. Pay $24.99 (or $19 for basic tier)
6. Server generates all scripts via `/api/generate` loop
7. Bundles into ZIP with config.json + setup-guide.md
8. Stores in Supabase Storage at `kits/{sessionId}/kit.zip`
9. Download link emailed + available in dashboard

### Key Challenges
- Sequential API calls to Anthropic (one per script) — takes 10-60s total
- Show real-time progress to user (SSE stream or polling)
- ZIP assembly server-side (use `jszip` npm package)
- Storage cleanup (delete ZIPs after 30 days)

### New Env Vars Needed
- `STRIPE_KIT_PRICE_ID` — price for dynamic kit
- No others needed

---

## Revenue Projections (rough)

| Product | Price | 100 users/mo | 500 users/mo |
|---------|-------|-------------|-------------|
| Static Kit | $19 one-time | $1,900 | $9,500 |
| Pro Generator | $12/mo | $1,200 MRR | $6,000 MRR |
| Dynamic Kit | $25 one-time | $2,500 | $12,500 |

---

## Execution Order
1. `[NEXT]` Option 2: Pro tier — database → Stripe → gating → billing page
2. `[LATER]` Option 3: Dynamic kit — `/build` page → generation loop → ZIP → payment
3. `[ONGOING]` Switch Stripe from test to live mode when ready for real revenue
