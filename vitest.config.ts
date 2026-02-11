import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],

  // Suppress Vite-level warnings (broken sourcemaps from eas-sdk, etc.)
  // Errors are still shown.
  logLevel: 'error',

  test: {
    environment: 'node',
    include: [
      'tests/unit/**/*.test.ts',
      'tests/api/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],

    // Silence application logging during test runs
    env: { LOG_LEVEL: 'silent' },

    // Suppress any remaining console output from leaking into the test runner.
    // Application logs are already silenced via LOG_LEVEL=silent; this catches
    // stray console.log in tests or noisy third-party dependencies.
    onConsoleLog() {
      return false;
    },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
      include: [
        'lib/agent-dna.ts',
        'lib/agent-prompts.ts',
        'lib/credits.ts',
        'lib/rate-limit.ts',
        'lib/response-lengths.ts',
        'lib/response-formats.ts',
      ],
      exclude: ['**/*.d.ts', 'tests/**'],
    },
  },
});
