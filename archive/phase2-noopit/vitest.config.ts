import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["lib/**/*.test.ts", "db/**/*.test.ts", "tests/**/*.test.ts"],
    passWithNoTests: true,
    // Load .env so live-DB tests can detect DATABASE_URL
    setupFiles: ["./tests/setup-env.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // server-only throws at import time in non-Next contexts.
      // Safe to no-op in tests — the guard is for bundler enforcement, not runtime.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
});
