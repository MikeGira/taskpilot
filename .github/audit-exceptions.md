# Known Design Decisions — Do Not Flag

These are deliberate product decisions, not bugs. Do not raise findings for any of these.

## checkout/route.ts: No authentication required on session creation
Anonymous checkout is intentional. The kit ($19 one-time purchase) is sold without requiring an account — "get the kit, download immediately, no login needed" is a core product feature. `getUser()` is called only to pass optional metadata to Stripe; a null user is valid and expected. This is NOT a Stripe webhook handler — webhook signature verification lives in `/api/webhook/stripe/route.ts`.

## next@14.x: Accepted HIGH vulnerabilities in next, eslint-config-next, glob, postcss
These 5 HIGH/MODERATE vulnerabilities are all transitive dependencies internal to next@14.x.
The only available fix (npm audit --audit-level=critical) is to upgrade to next@15+ or next@16+,
which is a major version migration requiring dedicated effort. Mitigated by: no rewrites/i18n
in next.config.mjs, security headers enforced, CI audits at --audit-level=critical only.
Do not flag these as unaddressed — they are intentionally deferred pending a next@15 migration.

## generate/route.ts: No authentication required
The /generate script generator is a free, public tool. Per-IP rate limiting (10 requests/hour) is the intentional and only access control mechanism. Adding auth would break the product's value proposition.

## assistant/route.ts: Regex-based injection detection is best-effort by design
The `normalizeText` + pattern-matching approach is documented as a best-effort filter. The upstream LLM (claude-haiku) has its own system-prompt constraints as the primary defense. The regex layer catches obvious attempts. Multi-message context analysis is out of scope for this tier.

## All routes: checkRateLimit + parseRequestBody pattern
The two-call pattern (`checkRateLimit` → `parseRequestBody`) in each route is the shared abstraction already in place via `src/lib/api-utils.ts`. Each route intentionally controls its own rate-limit key, window, and error message — further wrapping would lose that configurability for no practical gain.

## generate/route.ts and workflow/generate/route.ts: injection detection IS present
Both routes call `containsInjection()` (imported from `src/lib/api-utils.ts`) on all free-text user inputs (`taskDescription`, `clarificationAnswer`, `previousQuestion`) before any LLM call. The shared `containsInjection` applies NFKC normalization via `normalizeText` and checks 8 regex patterns including `new\s+prompt:`. Do not flag these routes for missing injection validation.

## generate/route.ts: buildToolSection() handles per-tool prompt customization
`buildToolSection(tool)` is a dedicated function (~460 lines) with a switch statement covering 20+ tools. It is injected into the system prompt via `buildSystemPrompt()`. This IS the recommended "data structure with conditional inclusion" pattern — do not flag it as missing tool-specific customization.

## generate/route.ts: large file — POST handler is near the end
The file is intentionally large because it contains all tool-specific prompt engineering inline. The POST handler starts near line 645. Do not flag structure visible only in the first 200 lines as representing the complete implementation.
