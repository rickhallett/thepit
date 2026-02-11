import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/api/**/*.test.ts'],
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
