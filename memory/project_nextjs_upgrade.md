---
name: project-nextjs-upgrade
description: "Next.js 14→16 upgrade plan — fully assessed, approved by Mike 2026-05-19, ready to implement"
metadata:
  type: project
---

Next.js 14.2.35 → 16.2.6 upgrade. Approved by Mike on 2026-05-19. Safe to implement.

**Why:** `npm audit --audit-level=high` fails CI on main and all Dependabot PRs because `next@14.x` carries 4 HIGH CVEs. Fix requires `next@16.2.6`. d3-color and ws/brace-expansion fixes already committed to main.

**How to apply:** Implement in a dedicated session. All changes are mechanical — listed below. Do rename (PilotKit) first, then this.

---

## Files to change

### 1. `src/lib/supabase/server.ts`
Make `createClient()` async and await `cookies()`:
```typescript
// Before
export function createClient() {
  const cookieStore = cookies();

// After
export async function createClient() {
  const cookieStore = await cookies();
```

### 2. All `createClient()` call sites — add `await`
These files call `createClient()` synchronously and need `await`:
- `src/app/api/admin/security-heal/route.ts:18`
- `src/app/api/checkout/route.ts:18`
- `src/app/api/download/[product]/route.ts:17`
- `src/app/checkout/page.tsx:9`
- `src/app/dashboard/account/page.tsx:9`
- `src/app/dashboard/analytics/page.tsx:22`
- `src/app/dashboard/layout.tsx:10`
- `src/app/dashboard/page.tsx:25`
- `src/app/api/account/delete/route.ts:8`
- `src/app/api/account/export/route.ts:12`
- `src/app/api/admin/improve-prompt/route.ts:7`
- `src/app/api/admin/security-audit/route.ts` — already has `await`, skip

### 3. `src/app/api/download/[product]/route.ts`
Make params a Promise:
```typescript
// Before
{ params }: { params: { product: string } }

// After
{ params }: { params: Promise<{ product: string }> }
// And add: const { product } = await params;
```

### 4. Server pages with `searchParams` — 3 files
Make searchParams a Promise and await before use:
- `src/app/(marketing)/page.tsx`
- `src/app/checkout/success/page.tsx`
- `src/app/generate/page.tsx`

### 5. `package.json`
```json
"next": "^16.2.6",
"react": "^19.0.0",
"react-dom": "^19.0.0",
"eslint-config-next": "^16.2.6",
"@types/react": "^19.0.0",
"@types/react-dom": "^19.0.0"
```

### 6. After package.json changes
Run `npm install` then `npm run typecheck`, then commit and push.

---

## `next.config.mjs` and `src/middleware.ts`
Already compatible with Next.js 15/16. No changes needed.

## After upgrade — remaining Dependabot PR work
- **PR #3 (TypeScript 6)**: Rebase after main upgrade — should pass all checks
- **PR #1 (security group)** and **PR #5 (resend)**: Should auto-pass (only failing on npm audit)
- **PR #2 (Stripe 16→22)**: npm audit clears but Build still fails — needs separate Stripe API migration
- **PR #4 (Zod 3→4)**: npm audit clears but Build still fails — needs separate Zod 4 API migration
