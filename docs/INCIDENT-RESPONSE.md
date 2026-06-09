# TaskPilot — Incident Response Plan (Runbook)

| Field | Value |
|---|---|
| Owner | Michael Twagirayezu (Incident Lead) |
| Version | 1.0 |
| Effective | 2026-06-09 |
| Next review | 2027-06-09 |
| Classification | Internal |

Operational runbook. Kept short enough to actually use during a 2am incident.

## Roles
- **Incident Lead:** Michael Twagirayezu (byosekumbuga@gmail.com) — declares severity, coordinates response, decides on notification.

## Severity tiers
| SEV | Definition | Examples |
|---|---|---|
| SEV1 | Confirmed breach of customer data, or full outage | PII/credential exposure, DB compromise |
| SEV2 | Significant security event, partial impact | Key leaked, privilege escalation, targeted attack |
| SEV3 | Minor / contained | Single failed control, low-risk vuln in prod |

## Response steps
1. **Detect & record.** Note time (UTC), source, what is observed. Start an incident log entry.
2. **Triage & declare severity.** Assign a SEV; the Incident Lead owns it.
3. **Contain.** Stop the bleeding: revoke/rotate exposed credentials and keys; disable affected accounts/tokens; roll back or take the service down on Vercel if needed; block the source.
4. **Eradicate.** Remove the root cause (patch, fix config, revoke malicious access).
5. **Recover.** Restore from a clean state; validate integrity; bring services back; monitor.
6. **Preserve evidence.** Capture logs/artifacts before they roll off. Do not destroy evidence.
7. **Notify (if required).** See decision rules below.
8. **Post-incident review.** Within 5 business days for SEV1/SEV2: timeline, root cause, what worked, corrective actions.

## Key-rotation quick list (containment)
Rotate any that may be exposed:
- GitHub tokens
- Vercel env secrets
- Supabase service-role key, anon key, and DB password
- Stripe API key + webhook signing secret
- Resend API key
- Anthropic API key
- `UNSUB_HMAC_SECRET`
- Domain/DNS and email credentials

## Notification decision rules
- **Personal-data breach (GDPR):** notify the supervisory authority within **72 hours** of awareness if there is risk to individuals; notify affected individuals if high risk.
- **PIPEDA:** report to the Office of the Privacy Commissioner of Canada and affected individuals if there is a "real risk of significant harm."
- **Payments:** notify Stripe if a payment-related compromise is suspected. (TaskPilot holds no card data — exposure is limited to Stripe IDs and metadata.)
- When unsure, consult counsel; document the decision and rationale.

## Contacts
- Hosting: Vercel · Database/Auth: Supabase · Payments: Stripe · Email: Resend · AI: Anthropic · Source/CI: GitHub
- Status pages: vercel-status.com · status.supabase.com · status.stripe.com · status.anthropic.com
