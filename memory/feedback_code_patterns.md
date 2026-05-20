---
name: feedback-taskpilot-code-patterns
description: TaskPilot-specific code patterns and gotchas — apply to all future TaskPilot work
metadata:
  type: feedback
---

Use `parsed.error.issues[0]?.message` not `parsed.error.errors[0]?.message` when accessing Zod validation error messages.

**Why:** ZodError's TypeScript types expose `.issues[]`, not `.errors[]`. Using `.errors` causes a build-breaking type error. Found and fixed in 5 routes during the 2026-05-18 audit (contact, subscribe, workflow/generate, workflow/feedback, generate).

**How to apply:** Any time a new API route uses `safeParse()` and needs to return the first validation message, always write `parsed.error.issues[0]?.message`.

---

Pin `engines.node` to a specific major version (`"20.x"`) not a range (`">=20.0.0"`).

**Why:** `>=20.0.0` causes Vercel to silently upgrade to Node 22/24 when they update infrastructure, risking breaking changes with no warning. `20.x` locks to Node 20 LTS and only takes patch/minor updates.

**How to apply:** Keep `"node": "20.x"` in package.json. Upgrade deliberately to `22.x` when ready and tested.

---

Shell resets to Bio project dir after each PowerShell command in this Claude Code session.

**Why:** The working directory persists in some environments but not others. TaskPilot git ops have been run as `git -C "D:\Projects\taskpilot"` rather than relying on `cd`.

**How to apply:** Always use `git -C "D:\Projects\taskpilot"` for git commands. Use `npm --prefix "D:\Projects\taskpilot"` for npm commands if needed. Alternatively, verify `pwd` before any git operation.

---

`npm run typecheck` works; `npx tsc --noEmit` shows help text instead of running.

**How to apply:** Always use `npm run typecheck` to verify TypeScript in this project.
