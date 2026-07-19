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
        'src/app/api/webhook/stripe/route.ts',
      ],
      // Ratchet, set just under what the suite currently achieves — high enough that
      // deleting or hollowing out a test fails CI, not an aspirational round number.
      // Raise these as coverage grows. Never lower them to make a build pass.
      thresholds: {
        lines: 96,
        functions: 94,
        branches: 87,
        statements: 95,
      },
    },
  },
});
