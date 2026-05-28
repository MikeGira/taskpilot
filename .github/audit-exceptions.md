# Known Design Decisions — Do Not Flag

These are deliberate product decisions, not bugs. Do not raise findings for any of these.

## checkout/route.ts: No authentication required on session creation
Anonymous checkout is intentional. The kit ($19 one-time purchase) is sold without requiring an account — "get the kit, download immediately, no login needed" is a core product feature. `getUser()` is called only to pass optional metadata to Stripe; a null user is valid and expected. This is NOT a Stripe webhook handler — webhook signature verification lives in `/api/webhook/stripe/route.ts`.

## generate/route.ts: No authentication required
The /generate script generator is a free, public tool. Per-IP rate limiting (10 requests/hour) is the intentional and only access control mechanism. Adding auth would break the product's value proposition.

## assistant/route.ts: Regex-based injection detection is best-effort by design
The `normalizeText` + pattern-matching approach is documented as a best-effort filter. The upstream LLM (claude-haiku) has its own system-prompt constraints as the primary defense. The regex layer catches obvious attempts. Multi-message context analysis is out of scope for this tier.

## All three routes: checkRateLimit + parseRequestBody pattern
The two-call pattern (`checkRateLimit` → `parseRequestBody`) in each route is the shared abstraction already in place via `src/lib/api-utils.ts`. Each route intentionally controls its own rate-limit key, window, and error message — further wrapping would lose that configurability for no practical gain.
