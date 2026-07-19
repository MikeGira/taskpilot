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

## 6. AI output grounding — layer mapping

TaskPilot's `/generate` and `/workflow` endpoints produce infrastructure code that users may run
against real systems that cost real money. Model output is therefore treated as untrusted input,
not as an answer. Layers are per `~/.claude/grounding-discipline.md`, strongest first.

**Audited 2026-07-19.** Status is what the code does today, not what the prompt asks for.

| Layer | Control | Status |
|---|---|---|
| **L1** — take high-entropy values away from the model | Generated file **extension** is derived in code from the validated `language`, never from the model's chosen filename. Path components stripped, charset restricted, length capped (`src/lib/generate-validation.ts`). | **Implemented** |
| **L1** | Request-side enums: `os`, `environment`, `tool` are zod enums (`VALID_TOOLS`), so the model cannot be steered to an unsupported target. | **Implemented** |
| **L1** | Cost-bearing literals *inside* generated scripts — cloud regions, EC2/GCP instance families, Terraform provider majors — are checked after generation against dated per-provider allowlists (`src/lib/iac-allowlists.ts`); fabricated-looking values get an **advisory review note** appended (never a block — a false block costs the user their generation). Allowlists are date-stamped (`LAST_VERIFIED`) and re-verified quarterly against live provider sources by `iac-allowlist-drift.yml` (Terraform Registry API, AWS `ip-ranges.json`), which opens a deduped, auto-closing tracking issue on drift. Flagging logic + drift logic are unit-tested and in the coverage gate. | **Implemented (advisory)** |
| **L2** — retrieval must precede generation | Pinned provider/module **versions** from the maintained manifest (`PROVIDER_VERSIONS`, same source as L1, quarterly drift-checked) are injected into the Terraform system prompt so the model is told current versions instead of fabricating them — the highest-entropy IaC error. Full doc grounding (curated per-tool reference snippets / RAG over live docs) is deferred. | **Partial (version pins)** — see below |
| **L3** — schema validation / constrained output | Model output is parsed then validated against `GenerateResultSchema`; unknown fields dropped, unknown `language` degraded to null, over-long payloads rejected, unusable results turned into a 502 rather than forwarded. | **Implemented** |
| **L4** — verification loop | Post-generation credential scan flags probable hardcoded secrets and appends a review note. Tool prompts require dry-run affordances (`-WhatIf`, `terraform plan`) in generated output. | **Partial** |
| **L4** | No server-side parse/lint of generated code (PSScriptAnalyzer, shellcheck, `terraform validate`). | **Open** — see below |
| **L5** — calibrated refusal | `needsClarification` path lets the model ask instead of guessing when the request is underspecified. | **Implemented** |

### Open items and why

**L1 cost-bearing literals — implemented as an advisory control.** A generated Terraform file can
name an instance size or region that does not exist, or a provider version that was never
published. The generator now scans output against dated per-provider allowlists
(`src/lib/iac-allowlists.ts`) and appends a review note for any AWS/GCP region, EC2/GCP instance
family, or Terraform provider major that is not recognized. It is advisory, not a block: the
catalogue is large and shifts, and a false block would cost a user their whole generation, so the
control only ever *under-warns*. The maintenance commitment is handled explicitly — the list is
date-stamped and re-verified quarterly against live provider sources (`iac-allowlist-drift.yml`:
Terraform Registry API for provider majors, AWS `ip-ranges.json` for regions), which files a
deduped, self-closing issue on drift. GCP/Azure regions and instance families are not live-checked
(they need auth or lack a stable public catalogue) and are kept current by the dated snapshot plus
manual review. This closes the L1 gap to the level that is proportionate and honest for a tool
that never executes the code it emits.

**L2 doc grounding — version-pin slice done, full grounding deferred.** The highest-value,
lowest-cost slice is implemented: the Terraform prompt now carries the pinned provider/module
versions from the shared manifest (`buildVersionPinNote`), so wrong-version fabrication — the
single highest-entropy IaC error — is grounded at the source rather than only caught after the
fact by L1. The expensive tail (fetching and pinning full provider *documentation* per tool, or
RAG over live docs) is **deferred**; trigger to build it is real recurring usage/revenue, since it
is a standing fetch-and-upkeep commitment disproportionate to current scale.

**L4 server-side linting.** `terraform validate`, `PSScriptAnalyzer` and `shellcheck` are separate
runtimes; a Vercel serverless function is the wrong place for them. The realistic path is a
queue plus a container, which is disproportionate to current usage.

### Standing posture

Until L1 and L2 are closed, TaskPilot's honest claim is that it produces a **reviewed-before-run
starting point**, not verified-correct infrastructure code. The product must not imply the output
is validated against live provider catalogues. **TaskPilot never executes generated code** — the
user is always the execution boundary, which is what keeps a fabricated literal a review problem
rather than an incident.

## 7. Accepted risks (with compensating controls)

A control weakness is only acceptable when it is documented, dated, compensated, and has a
revisit trigger. This section is the register. (SOC 2 CC3.2 / CC7.x · ISO A.5.7/A.8.8)

### AR-1 — CSP `script-src 'unsafe-inline'` retained

| Field | Value |
|---|---|
| Risk | The Content-Security-Policy allows `'unsafe-inline'` in `script-src`. In isolation this weakens defence against injected inline scripts (a class of XSS). |
| Decision | **Accepted**, dated 2026-07-19. |
| Rationale | The strict fix (per-request nonces) forces **every** page into dynamic rendering — Next.js disables static optimization, ISR, and CDN caching when a nonce is used. That is a permanent performance, SEO, and hosting-cost regression on the static marketing and legal pages, taken on to close a gap that currently has **no reachable execution sink** (see compensating controls). The cost is disproportionate to the residual risk at current scale. |
| Compensating controls | (1) **No HTML/JS execution sinks** — verified zero `dangerouslySetInnerHTML`, `innerHTML`/`outerHTML` assignment, `insertAdjacentHTML`, `document.write`, `eval`, or `Function` constructor in `src/`. (2) **Enforced by CI** — `tests/unit/no-xss-sinks.test.ts` fails the build if any such sink is introduced. (3) React auto-escapes all interpolated values by default. (4) Generated scripts render via shiki `codeToTokens` as React elements, **not** raw HTML. (5) Server-side prompt-injection filter on free-text inputs. (6) CodeQL `security-and-quality` on every PR. (7) The other two CSP faults ZAP bundles under rule 10055 (no-fallback directives, scheme wildcards) **were fixed**, and `tests/unit/csp.test.ts` asserts they stay fixed. |
| Revisit trigger | The sink guard failing (i.e. a feature genuinely needs an HTML/JS sink) **or** a compliance requirement mandating no `'unsafe-inline'`. Either event re-opens the nonce-vs-SRI decision. On revisit, prefer a `Content-Security-Policy-Report-Only` canary before enforcing. |

## 8. Open items (tracked)

- _None._ The **Privacy Policy** (`/privacy`) and **Terms of Service** (`/terms`) are published as live routes with footer links, aligned to the data flows, subprocessors, retention, and SAQ A status recorded above. Legal text is to be reviewed by counsel before being relied upon (templates are not legal advice).
