[← Root](../README.md)

# scripts/

4 utility scripts for development, testing, and infrastructure setup. These are not part of the application runtime.

## Inventory

| Script | Language | Purpose | Usage |
|--------|----------|---------|-------|
| `stripe-setup.sh` | Bash | Create Stripe products and prices for credit packs | `bash scripts/stripe-setup.sh` |
| `test-loop.mjs` | Node.js | Run the test suite repeatedly (stress testing) | `npm run test:loop` or `node scripts/test-loop.mjs` |
| `smoke-http.sh` | Bash | HTTP smoke test against a running instance | `bash scripts/smoke-http.sh [url]` |
| `create-eas-schema.mjs` | Node.js | Create the EAS attestation schema on Base L2 | `node scripts/create-eas-schema.mjs` |

### `stripe-setup.sh`

One-time setup script that creates Stripe products and prices for the credit pack catalog. Run after configuring `STRIPE_SECRET_KEY` in `.env`. Outputs the price IDs to paste into your environment.

### `test-loop.mjs`

Runs `vitest run` in a loop for N iterations (default: 10). Useful for detecting flaky tests or race conditions in mocked async flows.

### `smoke-http.sh`

Hits key routes with `curl` and reports HTTP status codes. Defaults to `https://thepit.cloud`; pass a URL argument for local or staging instances.

### `create-eas-schema.mjs`

One-time infrastructure script that registers the agent attestation schema on Ethereum Attestation Service (Base L2). Requires `EAS_PRIVATE_KEY` and Base RPC configuration.

---

[← Root](../README.md) · [Tests](../tests/README.md) · [App](../app/README.md)
