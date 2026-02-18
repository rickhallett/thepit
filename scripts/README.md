[← Root](../README.md)

# scripts/

8 utility scripts for development, testing, and infrastructure setup. These are not part of the application runtime.

## Inventory

| Script | Language | Purpose | Usage |
|--------|----------|---------|-------|
| `stripe-setup.sh` | Bash | Create Stripe products and prices for credit packs | `bash scripts/stripe-setup.sh` |
| `test-loop.mjs` | Node.js | Run the test suite repeatedly (stress testing) | `pnpm run test:loop` or `node scripts/test-loop.mjs` |
| `smoke-http.sh` | Bash | HTTP smoke test against a running instance | `bash scripts/smoke-http.sh [url]` |
| `sanity-check.sh` | Bash | Comprehensive route + middleware sanity check (auto-starts dev server) | `bash scripts/sanity-check.sh [--url URL]` |
| `create-eas-schema.mjs` | Node.js | Create the EAS attestation schema on Base L2 | `node scripts/create-eas-schema.mjs` |
| `reset-prod-data.ts` | TypeScript | Reset production data (admin only). Clears bout, reaction, vote, and analytics data. | `pnpm tsx scripts/reset-prod-data.ts` |
| `copyGenerate.ts` | TypeScript | LLM-powered copy variant generation for A/B testing | `pnpm run copy:generate` |
| `preview-e2e.sh` | Bash | Push, wait for Vercel preview deployment, run Playwright E2E against it | `./scripts/preview-e2e.sh [--url] [--skip-push]` |
| `emit-level4-record.ts` | TypeScript | Emit one Level-4 NDJSON evaluation record from pitstorm + QA artifacts | `pnpm run level4:emit -- --window ... --run ... --pipeline ... --class ...` |
| `run-level4-gate.sh` | Bash | Run external darkfactorio `dfgatev01` against a window file | `pnpm run level4:gate:baseline -- --window ... --records runs/<window>.ndjson` |

### `stripe-setup.sh`

One-time setup script that creates Stripe products and prices for the credit pack catalog. Run after configuring `STRIPE_SECRET_KEY` in `.env`. Outputs the price IDs to paste into your environment.

### `test-loop.mjs`

Runs `vitest run` in a loop for N iterations (default: 10). Useful for detecting flaky tests or race conditions in mocked async flows.

### `smoke-http.sh`

Hits key routes with `curl` and reports HTTP status codes. Defaults to `https://thepit.cloud`; pass a URL argument for local or staging instances.

### `sanity-check.sh`

Comprehensive sanity check that tests 25+ routes and middleware behaviors. Optionally starts the dev server automatically. Checks health endpoint, SEO meta routes (robots.txt, sitemap.xml), all public SSR pages, API route validation, admin auth rejection, session cookies, UTM tracking, CSP headers, short link redirects, and bout page handling. Exit code 0 if all checks pass.

### `create-eas-schema.mjs`

One-time infrastructure script that registers the agent attestation schema on Ethereum Attestation Service (Base L2). Requires `EAS_PRIVATE_KEY` and Base RPC configuration.

### `reset-prod-data.ts`

Admin-only data reset script for production. Clears bouts, reactions, votes, short links, and analytics data while preserving user accounts, agents, and credit balances. Run with `pnpm tsx scripts/reset-prod-data.ts`. Requires `DATABASE_URL`.

---

[← Root](../README.md) · [Tests](../tests/README.md) · [App](../app/README.md)
