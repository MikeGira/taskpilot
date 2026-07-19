# Runbook: Production Rollback

**Purpose:** restore a working TaskPilot production deployment fast when a release breaks it.
**Target:** service restored in under 10 minutes from detection.
**Applies to:** `taskpilot.makinyx.com` (Vercel project `mikegiras-projects/taskpilot`, production branch `main`).

---

## 1. Decide: roll back or fix forward

Roll back **immediately**, before diagnosing, when any of these are true:

- The site is down, or the landing page returns non-200.
- Checkout or the Stripe webhook is failing — every minute of this is lost money and a support burden.
- Login or download is broken for real users.
- A secret, PII, or internal detail is exposed in a response.

Fix forward instead when the fault is cosmetic, affects one non-critical page, or the previous
deployment is equally broken.

**Bias to rolling back.** Diagnosis takes as long as it takes; a rollback takes seconds and is
itself reversible. Diagnose after the site is healthy again.

---

## 2. What a Vercel rollback does and does NOT revert

Read this before rolling back — most rollback incidents that go wrong go wrong here.

| Reverted by rollback | NOT reverted — handle separately |
|---|---|
| Application code and build output | **Environment variables** — changes in project settings persist |
| Cron job definitions (revert to the rolled-back deployment's state) | **Supabase schema and data** — no migration is undone |
| Routing and headers from `next.config.mjs` | **Stripe dashboard config** (products, prices, webhook endpoints) |
| | **Supabase Auth settings** (Site URL, redirect URLs, SMTP) |

Two consequences worth internalizing:

1. **If the bad release included a schema change, rolling back the code can make things worse** —
   old code against a new schema. Check whether the release touched `supabase/schema.sql` before
   rolling back. If it did, roll back the schema first or fix forward.
2. **If the bad release depended on a new env var, rolling back does not remove that var.** Usually
   harmless, but it means the rolled-back build may behave differently than it did originally.

---

## 3. Procedure

### 3a. Roll back (dashboard — the primary path)

1. Open the [project overview](https://vercel.com/mikegiras-projects/taskpilot).
2. On the **Production Deployment** tile, click **Instant Rollback**.
3. Select the target deployment. On the **Hobby** plan only the *immediately previous* production
   deployment is eligible; Pro and Enterprise can pick any deployment previously aliased to
   production. Confirm which plan the account is on before assuming a deep rollback is available.
4. Verify the domain list in the dialog includes `taskpilot.makinyx.com`.
5. Click **Confirm Rollback**. It takes effect immediately.

### 3b. Roll back (CLI — when the dashboard is unavailable)

```bash
npx vercel ls taskpilot --prod          # find the last known-good deployment URL
npx vercel promote <deployment-url>     # promote it back to production
```

### 3c. Verify — do not skip this

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://taskpilot.makinyx.com/          # expect 200
curl -sI https://taskpilot.makinyx.com/ | grep -iE "strict-transport|x-frame|x-content-type"
curl -s -o /dev/null -w "%{http_code}\n" https://taskpilot.makinyx.com/api/health
```

Then check by hand: the landing page renders, `/login` loads, and `/generate` produces a script.

### 3d. THE TRAP — re-enable automatic deploys

**After a rollback, Vercel turns off auto-assignment of production domains. Pushes to `main` will
build but will NOT go live.**

This is the single most common way a rollback causes a second incident: the fix gets merged, CI is
green, everyone assumes it shipped, and production is still serving the old build — sometimes for
days.

To restore normal behaviour once the fix is merged and deployed:

- Dashboard: click **Undo Rollback** on the production deployment tile and select the deployment to promote, **or**
- CLI: `npx vercel promote <new-deployment-url>`

Confirm normal operation is restored by pushing a trivial commit and verifying it reaches production.

---

## 4. After the incident

1. Open a GitHub issue describing what broke, how it was detected, and the recovery time.
2. **Add a regression test.** A rollback that produces no test is a rollback you will repeat. Unit
   or integration test if the fault was in logic (`tests/unit/`), Playwright spec if it was a broken
   user path (`tests/e2e/`).
3. Record the recovery time — detection to restored service. This is the DORA *failed deployment
   recovery time* metric; elite performers sit under one hour.
4. If CI was green while production was broken, that is the finding worth acting on: the gap is in
   the test suite, not in the deploy process.

---

## 5. The drill

**Run quarterly.** An untested rollback path is an assumption, not a capability. The point of the
drill is to find the decay — an expired login, a changed dashboard layout, a stale deployment
list — while it is cheap to find.

Run it at low traffic. The whole thing takes about five minutes.

1. Note the current production deployment URL and the current time.
2. Roll back one deployment using §3a. Start the clock.
3. Run the §3c verification. Confirm the site is healthy on the older build.
4. Undo the rollback using §3d. Confirm the current build is live again.
5. Push a trivial commit and confirm it auto-deploys — this proves §3d actually restored
   auto-assignment, which is the step most likely to be missed.
6. Record elapsed time and anything that surprised you in the drill issue.

The `rollback-drill.yml` workflow opens a checklist issue each quarter. Close it when the drill is done.

---

## 6. Escalation

Solo project — no on-call rotation. If a rollback does not restore service, the fault is not in the
application build. Check, in order:

1. [Vercel status](https://www.vercel-status.com/)
2. [Supabase status](https://status.supabase.com/) — a paused or unreachable database presents as a
   broken site even on a known-good build. This has happened before (2026-07-02); `/api/health` and
   the `db-keepalive.yml` workflow exist because of it.
3. [Stripe status](https://status.stripe.com/)
4. [Anthropic status](https://status.anthropic.com/) — affects `/generate` and Pilot only, not the
   whole site.

Related: [`docs/INCIDENT-RESPONSE.md`](../INCIDENT-RESPONSE.md).
