import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Native @/* resolution — Vitest 4 supersedes the vite-tsconfig-paths plugin.
  resolve: { tsconfigPaths: true },
  test: {
    // Server-side logic (lib modules + route handlers) — no DOM needed. Component
    // behaviour is covered by the Playwright specs, which exercise the real render.
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    // tests/e2e is Playwright's; its `test` export is a different runner.
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      // Scoped to the modules these tests actually target, so the percentage means
      // something. Widening this list without adding tests will fail the thresholds —
      // that is the point. Ratchet the numbers up as coverage grows; never down.
      include: [
        'src/lib/tokens.ts',
        'src/lib/rate-limit.ts',
        'src/lib/validations.ts',
        'src/lib/api-utils.ts',
        'src/lib/generate-validation.ts',
        'src/lib/iac-allowlists.ts',
        'src/app/api/webhook/stripe/route.ts',
        'src/app/api/download/[product]/route.ts',
        'src/app/api/download/session/route.ts',
        'scripts/lib/audit-parse.js',
        'scripts/lib/audit-gate.js',
        'scripts/lib/iac-drift.js',
        'scripts/lib/golden-validate.js',
      ],
      // Ratchet, set just under what the suite currently achieves — high enough that
      // deleting or hollowing out a test fails CI, not an aspirational round number.
      // Raise these as coverage grows. Never lower them to make a build pass.
      //
      // 2026-07-19: added the two download routes (access-control + money path). They are
      // fallback-heavy, so aggregate branch % recalibrated 87 -> 86 across a much larger
      // surface (211 branches vs 91; 183 covered vs 82). Lines/statements ROSE — this is a
      // bigger tested surface, not a weakened gate.
      // 2026-07-19 (later): added the grounding L1 allowlist scan + drift lib with dedicated
      // suites; aggregate branch % climbed to 87.69, so the branch ratchet moves 86 -> 87.
      // 2026-07-27: added the dependency-audit gate decision logic (scripts/lib/audit-gate.js)
      // with a 15-case suite; aggregate branch % climbed to 88.31, so the ratchet moves 87 -> 88.
      thresholds: {
        lines: 99,
        functions: 95,
        branches: 88,
        statements: 98,
      },
    },
  },
});
