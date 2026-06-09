# TaskPilot — Compliance Statement

| Field | Value |
|---|---|
| Owner | Michael Twagirayezu (sole proprietor) |
| Product | TaskPilot (`https://taskpilot-umber.vercel.app`) |
| Version | 1.0 |
| Effective | 2026-06-09 |
| Next review | 2027-06-09 (or on any change to data flows, payments, or subprocessors) |
| Jurisdiction | Ontario, Canada |
| Classification | Internal |

> **Readiness, not certification.** TaskPilot is built to the *technical controls* of SOC 2, ISO 27001, and PCI DSS, and to GDPR/PIPEDA obligations. A formal certificate/attestation additionally requires written policies, a risk assessment, an evidence window, and an external auditor/QSA. We do not claim to be "certified"; we claim to be **built to these controls**.

## 1. Data classification

| Class | Examples in TaskPilot | Handling |
|---|---|---|
| **Restricted** | Supabase service-role key, Stripe secret + webhook secret, Anthropic key, Resend key, `UNSUB_HMAC_SECRET` | Environment variables only (Vercel + local `.env`). Never in code, logs, or client. Server-side use only. |
| **Confidential (PII)** | User email, auth identity, purchase records (email, amount, Stripe IDs, status) | RLS-protected Supabase tables; server-side authorization on every request; TLS in transit. |
| **Internal** | `generation_feedback` rows (os, environment, language, rating, comment, **hashed** IP, timestamp), prompt content sent to Anthropic | No raw PII in feedback (IP is hashed). Prompt content carries no secrets/PII by design. |
| **Public** | Marketing pages, the free script generator UI, this document, `SECURITY.md` | No restrictions. |

**No cardholder data is in any class** — see §3.

## 2. Subprocessors

All third parties that process TaskPilot data. (ISO A.5.19 · SOC 2 CC9.2 · GDPR Art. 28 · PCI 12.8)

| Vendor | Service | Data processed | Data location | Attestation |
|---|---|---|---|---|
| Vercel | Hosting / CDN / serverless | Request traffic, logs | Global edge (primary US) | SOC 2 Type II |
| Supabase | Postgres / Auth / Storage | User PII, purchase records, feedback | us-west-2 (AWS, Oregon, USA) | SOC 2 Type II |
| Stripe | Payments (hosted Checkout) | Cardholder data (Stripe-side only) | Global | PCI DSS Level 1, SOC 2 |
| Resend | Transactional email | Recipient email, message content | US | SOC 2 |
| Anthropic | AI inference (script generation + chat) | Prompt content (no secrets/PII by design) | US | SOC 2 Type II |
| GitHub | Source control / CI | Code, CI metadata | US | SOC 2, ISO 27001 |

Building on these attested providers is itself a citable control. Each is reviewed at least annually and whenever the integration changes.

## 3. PCI DSS — SAQ A scope statement

TaskPilot qualifies for **PCI DSS v4.0.1 SAQ A** (the lightest validation):

- Payments are **fully outsourced to Stripe** via Stripe-hosted Checkout. Card data is entered directly into Stripe's hosted page.
- TaskPilot **does not store, process, or transmit cardholder data** on its own systems. It stores only non-card metadata (email, amount, Stripe IDs, status).
- The Stripe webhook route verifies the signature against the signing secret using the **raw request body**; no card data is logged.
- **No raw card / CVV / expiry input field appears on any TaskPilot-owned page.** Any future feature proposing direct card handling is rejected and routed through Stripe (SDLC gate).
- Payment-page integrity / script-attack protection is inherited from Stripe's PCI attestation. v4.0.1 SAQ A removed merchant requirements 6.4.3 and 11.6.1 (effective 2025-03-31) for hosted/iframe flows.

**Validation evidence (Stripe Dashboard → Settings → Compliance and documents → My PCI compliance, verified 2026-06-09):** Stripe assessed this account as **PCI Level 4**, recommended documentation **SAQ A**, status **"No action needed — not required to submit PCI compliance information."** For a Level 4 merchant on a fully Stripe-hosted integration, Stripe manages the attestation and requires no merchant SAQ A submission; the dashboard determination is the standing evidence. Re-confirm annually or whenever the integration changes.

**Cardholder data flow:**
```
User browser ──(card entered directly into Stripe-hosted Checkout)──▶ Stripe
TaskPilot server ◀──(Stripe webhook: event metadata, NO card data; signature-verified)── Stripe
```

## 4. Control mapping (selected)

| Area | Control in TaskPilot | Framework refs |
|---|---|---|
| MFA | Enabled on **all** production-reaching accounts (GitHub, Vercel, Supabase, Stripe, registrar, email) | SOC 2 CC6.1 · ISO A.5.17 · PCI 8.4 |
| Access control | Supabase RLS on all tables; least privilege; service-role key server-only; admin surface gated on `ADMIN_EMAIL` | CC6.1–6.3 · A.5.15 |
| Authentication | Supabase Auth; `getUser()` (server-validated) used in middleware/server components, never `getSession()` | CC6.1 · A.5.16 |
| Encryption | TLS/HSTS in transit; provider-managed encryption at rest | CC6.7 · A.8.24 |
| Secrets | Vercel env vars; nothing committed; gitleaks gate in CI | CC6.1 · A.8.24 |
| Secure SDLC | CI gates: gitleaks + CodeQL (incl. `actions`) + dependency audit + actionlint + build, green before deploy; Dependabot + auto-merge of green patch/minor updates | CC8.1 · A.8.25–8.28 |
| Vulnerability mgmt | Dependabot alerts + `npm audit` in CI; daily cross-repo security sweep | A.8.8 · PCI 6.3 |
| Rate limiting | Per-IP limits on `/api/generate` (10/hr), feedback (5/hr), chat (30/hr) | CC6.6 |
| Input validation | Boundary validation; parameterized queries via Supabase client; LLM JSON output schema-checked | A.8.26 |
| Logging | Auth, admin actions, payment/webhook events logged; no secrets/PII/card data in logs | CC7.2 · A.8.15 |
| Incident response | See [INCIDENT-RESPONSE.md](./INCIDENT-RESPONSE.md) | CC7.3–7.5 · A.5.24–5.26 |

## 5. Data retention & disposal

| Data | Retention | Basis |
|---|---|---|
| `generation_feedback` / analytics | 24 months, then deleted | Product improvement; data minimization |
| User accounts / auth identity | Until deletion requested; then purged | GDPR Art. 17 / PIPEDA |
| Deleted-account personal data | Purged on request; backups expire within 30 days | Right to erasure |
| Purchase records | 7 years | Tax / accounting obligation (overrides erasure for these fields) |
| Operational logs | 90 days | Security monitoring vs. minimization balance |

**GDPR deletion order:** the confirmation email is sent **first** (while `user.email` is available), then `auth.admin.deleteUser()` is called last (it invalidates the session).

## 6. Open items (tracked)

- Publish a **Privacy Policy** and **Terms of Service** as live routes (`/privacy`, `/terms`) with footer links — required because TaskPilot holds personal data and takes payment.
