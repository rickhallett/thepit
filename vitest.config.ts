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
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
      include: [
        'lib/agent-dna.ts',
        'lib/agent-prompts.ts',
        'lib/credits.ts',
        'lib/response-lengths.ts',
        'lib/response-formats.ts',
      ],
      exclude: ['**/*.d.ts', 'tests/**'],
    },
  },
});
