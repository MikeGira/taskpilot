# Runbook — Migrate TaskPilot to Supabase publishable/secret API keys

**Status:** Planned, non-urgent. **Deadline driver:** Supabase deprecates the legacy
`anon`/`service_role` JWT keys by **end of 2026** ([migration docs](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)).
**Risk if rushed:** breaking the live app's auth, RLS, admin, payments, or storage. Do it
deliberately, verify in a preview first, and **never deactivate the legacy keys until the new keys
are confirmed working in production.**

> This is **not** incident response. Nothing leaked (see
> `memory/project_gitleaks_schedule_false_positive.md`). This is routine modernization.

## Why migrate

- Legacy `anon`/`service_role` keys are JWTs signed by a single shared secret; that secret
  effectively **cannot be rotated** without severing every connection at once.
- New keys are independently **rotatable and instantly revocable**: `sb_publishable_…` (public,
  RLS-bound, replaces `anon`) and `sb_secret_…` (server-only, bypasses RLS, replaces `service_role`).
- Both legacy and new keys work **simultaneously** during the window, so cutover is incremental.

## Current key usage (what changes)

| Env var | Used by | Role today | Replace with |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (SSR) | legacy `anon` | `sb_publishable_…` |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase/admin.ts` (admin/service) | legacy `service_role` | `sb_secret_…` |

Both names are also asserted present in `src/app/api/admin/security-audit/route.ts`
(`REQUIRED_ENV_VARS`). Mike already created an `sb_secret_…` key (~2026-05) and an
`sb_publishable_…` key exists on the dashboard.

## Approach: keep the env-var names, swap the values (lowest-risk)

`@supabase/ssr` and `@supabase/supabase-js` accept the new keys as drop-in string values, so the
**code does not need to change** — only the env-var *values* change. Keeping the names
`NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` avoids touching `client.ts`,
`server.ts`, `admin.ts`, and the audit list. (Optional later cleanup: rename to
`…_PUBLISHABLE_KEY` / `…_SECRET_KEY` for clarity — a separate, code-only PR.)

## Steps

1. **Grab both new keys** — Supabase Dashboard → Project Settings → API Keys:
   - Publishable: `sb_publishable_…`
   - Secret: `sb_secret_…` (create a fresh one named e.g. `taskpilot_prod_app` if unsure which is live)
2. **Verify in a Vercel Preview first** (do not touch Production yet):
   - In Vercel → TaskPilot → Settings → Environment Variables, set the **Preview** scope values of
     `NEXT_PUBLIC_SUPABASE_ANON_KEY` = publishable and `SUPABASE_SERVICE_ROLE_KEY` = secret.
   - Deploy a preview and walk the **full critical path** (checklist below).
3. **Cut over Production** — update the same two vars in **all three** places:
   - Vercel (Production scope) → redeploy
   - GitHub → Settings → Secrets and variables → Actions
   - Local `.env`
4. **Soak** — watch the app + Supabase logs (`get_logs`) for auth/RLS/permission errors for a day.
5. **Only then** deactivate the legacy `anon`/`service_role` keys in the dashboard. Keep the new
   secret key value out of git (it is a real credential — unlike the old public anon key).

## Verification checklist (run in Preview, repeat in Prod)

- [ ] **Auth**: magic-link + password login → `auth/callback` exchange → `getUser()` works.
- [ ] **RLS (anon/authenticated)**: dashboard download list, account page, generation feedback,
      workflow generations insert — all read/write as expected under the publishable key.
- [ ] **Admin (service/secret)**: `/dashboard/analytics`, `/api/admin/security-audit` (RPC
      `get_rls_status`), `/api/admin/security-heal` (RPC `enable_rls_on_table`) — these need the
      secret key to bypass RLS and to be the only role allowed to call the migration-005 functions.
- [ ] **Stripe webhook**: a test `checkout.session.completed` inserts a `purchases` row via the
      admin client and sends the email.
- [ ] **Storage**: `/api/download/[product]` generates a working signed URL from the private
      `products` bucket.
- [ ] `security-audit` reports all env vars present (names unchanged, so this stays green).

## Rollback

Because legacy keys remain active until step 5, rollback is just restoring the previous env-var
values in Vercel/GitHub/local and redeploying. After step 5 (legacy deactivated), rollback means
re-enabling them in the dashboard — so confirm the soak is clean before doing step 5.

## Mike-only actions (cannot be automated)

Dashboard logins are required: copying keys from Supabase, setting Vercel/GitHub/.env values,
deactivating legacy keys. Claude can do all code/migration/CI work and provide exact click-paths.
