# tests

Test suites that cannot be co-located (integration, e2e, shared helpers).

## Structure

- `integration/api/` — API route integration tests (Vitest, one file per domain)
- `e2e/` — Playwright end-to-end user journey tests
- `helpers/` — shared test utilities (createTestUser, test presets, DB reset)

## Co-located tests

Unit tests live BESIDE their source files in `lib/*/`.
Only integration and e2e tests live here.

## Naming

- Integration: `{domain}.test.ts` (e.g., `bouts.test.ts`, `credits.test.ts`)
- E2e: `{workflow}.spec.ts` (e.g., `bout-flow.spec.ts`, `auth-flow.spec.ts`)
