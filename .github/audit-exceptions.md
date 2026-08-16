# Known Design Decisions — Do Not Flag

These are deliberate product decisions, not bugs. Do not raise findings for any of these.

## checkout/route.ts: No authentication required on session creation
Anonymous checkout is intentional. The kit ($19 one-time purchase) is sold without requiring an account — "get the kit, download immediately, no login needed" is a core product feature. `getUser()` is called only to pass optional metadata to Stripe; a null user is valid and expected. This is NOT a Stripe webhook handler — webhook signature verification lives in `/api/webhook/stripe/route.ts`.

## generate/route.ts: No authentication required
The /generate script generator is a free, public tool. Per-IP rate limiting (10 requests/hour) is the intentional and only access control mechanism. Adding auth would break the product's value proposition.

## assistant/route.ts: Regex-based injection detection is best-effort by design
The `normalizeText` + pattern-matching approach is documented as a best-effort filter. The upstream LLM (claude-haiku) has its own system-prompt constraints as the primary defense. The regex layer catches obvious attempts. Multi-message context analysis is out of scope for this tier.

## AI routes: per-route `ai.ok` error-response branches are intentional
generate, workflow/generate, and assistant each map `callAnthropic()` failures (timeout/network/upstream) to their own user-facing error messages ("Generation timed out" vs "Request timed out" etc.). The three-line mapping is intentionally duplicated so each route controls its own copy — extracting a helper would need a three-message config object per call site and save nothing. Do not flag this as duplication.

## All routes: checkRateLimit + parseRequestBody pattern
The two-call pattern (`checkRateLimit` → `parseRequestBody`) in each route is the shared abstraction already in place via `src/lib/api-utils.ts`. Each route intentionally controls its own rate-limit key, window, and error message — further wrapping would lose that configurability for no practical gain.

## generate/route.ts and workflow/generate/route.ts: injection detection IS present
Both routes call `containsInjection()` (imported from `src/lib/api-utils.ts`) on all free-text user inputs (`taskDescription`, `clarificationAnswer`, `previousQuestion`) before any LLM call. The shared `containsInjection` applies NFKC normalization via `normalizeText` and checks 8 regex patterns including `new\s+prompt:`. Do not flag these routes for missing injection validation.

## generate/route.ts: buildToolSection() handles per-tool prompt customization
`buildToolSection(tool)` is a dedicated function (~460 lines) with a switch statement covering 20+ tools. It is injected into the system prompt via `buildSystemPrompt()`. This IS the recommended "data structure with conditional inclusion" pattern — do not flag it as missing tool-specific customization.

## generate/route.ts: large file — POST handler is near the end
The file is intentionally large because it contains all tool-specific prompt engineering inline. The POST handler starts near line 645. Do not flag structure visible only in the first 200 lines as representing the complete implementation.

## webhook/stripe/route.ts: unhandled verified event types intentionally return 200
Acknowledging every signature-verified event with `200` is the correct Stripe integration pattern: Stripe treats any non-2xx as a delivery failure and retries for up to 3 days, so returning `400`/`202` for event types we don't handle would create retry storms for events we deliberately ignore. Unhandled types are `console.log`ged for observability, never silently dropped. A `500` is returned ONLY when our own infrastructure failed (DB unreachable) so Stripe retries a genuinely-lost purchase event. Do not flag the `default: 200` branch as a "silent failure window" or suggest returning an error status for unknown types.

## webhook/stripe/route.ts: error handling already separates transient vs. terminal
`handleCheckoutComplete` distinguishes the two cases correctly and logs once: a DB/product-lookup error (including network failure after retries) THROWS, is caught by the single caller-level catch, logged once, and returns `500` so Stripe retries; a genuinely-absent product row is a no-op `return` (logged, no `500`) because retrying will not make the row appear. There is no double-logging and a missing product row does NOT return `500`. Do not flag this as redundant error handling.

## webhook/stripe/route.ts: `if (!customerEmail)` already rejects the empty-string fallback
Raised as `[SECURITY]` in issue #92 on the premise that `customerEmail` is initialised to `''` and therefore "passes the check". It does not: `''` is falsy, so `!customerEmail` is `true` and the handler returns early exactly as intended. The suggested `!customerEmail?.trim()` would only add whitespace-only handling, which Stripe cannot produce for `customer_email` / `customer_details.email`. Do not re-raise.

## account/delete/route.ts: `DELETE` is not reachable cross-site, so no CSRF token is required
Raised as `[SECURITY]` in issue #92. A cross-site `DELETE` is not a CORS-simple request, so a browser must preflight it with `OPTIONS`; the route sends no permissive CORS headers, so the preflight fails and the request is never issued. HTML forms cannot emit `DELETE` at all, and Supabase auth cookies are `SameSite=Lax`, so they are not attached to a cross-site request in the first place. Three independent controls, none of which depend on a token. Do not re-raise without a concrete request that reaches the handler.

## Audit-bot findings citing `/* ...long string omitted... */` are truncation artefacts
`prepareContent()` elides the middle of large files before sending them to the model, and the marker it inserts has repeatedly been reported back as a defect in the source ("malformed template string", "incomplete catch block" — issue #92's `[SIMPLIFICATION]` item). The marker is never in the file. Verify against the real source before acting on any finding that quotes it.

**Now enforced mechanically (2026-08-06).** This entry, and the explicit instruction in the model prompt, both failed to stop it: issue #101 raised the identical finding on 2026-08-02. A rule enforced only by asking the model nicely is not enforced. `stripTruncationArtifactFindings()` in `scripts/lib/audit-parse.js` now discards any finding quoting a marker before an issue can be filed, covered by regression tests in `tests/unit/audit-parse.test.ts` built from the actual #101 body. Do not remove the prompt instruction — it is still the cheap first line — but the filter is the guarantee.

## webhook/stripe/route.ts: `productErr` IS thrown (issue #101 `[SECURITY]`, false positive)
Issue #101 claimed `handleCheckoutComplete` "logs `productErr` but does not throw it", leaving an orphaned purchase upsert with `product === null`. The source does the opposite: `if (productErr) { throw new Error(\`product lookup failed: ${productErr.message}\`); }` sits immediately after the lookup, and `purchaseError` is thrown the same way a few lines below. Both were verified against the file on 2026-08-06. Do not re-raise.

## generate/route.ts: scanCostBearingLiterals() returns only safe, templated strings
The advisory review notes appended to `explanation` are hardcoded template strings interpolating only tokens matched by fixed regexes with restricted charsets (regions/instance families/version constraints — no quotes, no HTML). The value is returned in a JSON field (escaped by `JSON.stringify`) and rendered as text by React (escaped); there are no HTML/JS execution sinks in `src/` (enforced by `tests/unit/no-xss-sinks.test.ts`). This is not an injection vector. Do not flag appending its result to `explanation`.

## webhook/stripe/route.ts: `purchaseError` IS defined (issue #110 `[SECURITY]`, false positive)
Issue #110 claimed `purchaseError` "is never defined in the visible code", so the thrown message
would interpolate `undefined` and lose the error context. The source defines it by renaming inside a
destructuring pattern — `const { error: purchaseError } = await dbWithRetry(...)` at line 78 — then
checks it at 93 and throws `purchase upsert failed: ${purchaseError.message}` at 94. Verified against
the file on 2026-08-16. This is the third variant of the same defect: the bot reads a destructuring
rename as a bare reference and reports the definition it did not receive as absent (see the `productErr`
entry above for #101, and #92). Do not re-raise. If it recurs, the durable fix is to extend
`scripts/lib/audit-parse.js` to drop findings asserting a symbol is undefined when that symbol appears
on the left of a `:` inside a destructuring pattern in the same file.
