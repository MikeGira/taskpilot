---
name: project-taskpilot-security-pending
description: "TaskPilot Phase 2 security/reliability items — app is production-safe without them, implement when traffic grows"
metadata:
  type: project
---

Three Phase 2 improvements pending for TaskPilot/PilotKit. The app is production-safe without them. Implement when traffic scales.

**Why:** Found during 2026-05-18 security audit. Not urgent but matter at scale.

**How to apply:** Check these items when scoping future improvement sessions. Do not block launch or rename on these.

---

## 1. Upstash Redis Rate Limiting (Phase 2A)
**Current state:** In-memory rate limiting (resets on Vercel cold starts).
**Fix:** Replace `lib/rate-limit.ts` with Upstash Redis. Needs `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` env vars.
**Impact:** Rate limits survive cold starts; works correctly across multiple serverless instances.

## 2. Admin Role in DB (Phase 2B)
**Current state:** Admin access checked via `ADMIN_EMAIL` env var string comparison.
**Fix:** Add `is_admin` boolean column to `profiles` table in Supabase. Update all admin route checks.
**Impact:** More scalable; can add multiple admins without touching env vars.

## 3. Email Retry Queue (Phase 2C)
**Current state:** Stripe webhook email failures have no retry — if Resend is down, confirmation email is lost.
**Fix:** Add `email_queue` table, `/api/cron/retry-emails` route, `vercel.json` cron entry.
**Impact:** Reliable email delivery for purchase confirmations even during transient Resend outages.

---

## Also pending (from 2026-05-18 session)
- **Vercel Bot Protection → switch to full blocking** — Both Bio and TaskPilot are in Logging mode since 2026-05-18. Ready to switch after 2026-05-23. Check Firewall → Traffic logs; if flagged traffic looks like bots (not real users), switch to full blocking.
