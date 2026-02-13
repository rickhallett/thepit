[← Root](../README.md)

# tests/

63 test files across 4 directories. Unit and API tests run via Vitest; E2E tests run via Playwright. Coverage thresholds are enforced at 85% on critical lib modules.

## Directory Structure

```
tests/
├── unit/          38 test files — pure function tests, mocked DB/external deps
├── api/           24 test files — API route handler tests with mocked deps
├── integration/    1 test file  — real DB connection via TEST_DATABASE_URL
└── e2e/            1 test file  — Playwright browser tests
```

## Running Tests

```bash
pnpm run test:unit          # Unit + API tests with coverage (Vitest)
pnpm run test:integration   # Real DB tests (requires TEST_DATABASE_URL)
pnpm run test:watch         # Vitest watch mode
pnpm run test:e2e           # Playwright E2E (requires running server or BASE_URL)
pnpm run test:ci            # Full gate: lint + typecheck + unit + integration
```

## Test Coverage by Domain

### Unit Tests (38 files in `tests/unit/`)

| Domain | Files | What's Tested |
|--------|-------|---------------|
| Agent system | `agent-dna.test.ts`, `agent-dna-edge.test.ts`, `agent-prompts.test.ts`, `agent-registry.test.ts`, `agent-detail.test.ts`, `agent-detail-edge.test.ts`, `agent-links.test.ts` | Manifest hashing, prompt generation, registry resolution, lineage chain walking, URL encoding |
| Credits & economy | `credits.test.ts`, `credits-settle.test.ts`, `credit-catalog.test.ts`, `intro-pool.test.ts`, `free-bout-pool.test.ts` | Cost computation, preauthorization, settlement (refund/charge/exact), pool mechanics |
| Users & auth | `users.test.ts`, `users-edge.test.ts`, `admin.test.ts`, `referrals.test.ts`, `onboarding.test.ts` | User sync, profile refresh, email masking, admin checks, referral bonuses |
| Server actions | `actions.test.ts`, `actions-happy.test.ts` | All 8 server actions: auth guards, validation, Stripe flow, redirects |
| Tier system | `tier.test.ts`, `tier-helpers.test.ts` | Tier resolution, bout/model/agent access checks, daily limits |
| Leaderboard | `leaderboard.test.ts`, `leaderboard-edge.test.ts` | Multi-range aggregation, caching, division-by-zero guards |
| AI & config | `ai.test.ts`, `ai-env.test.ts`, `ask-the-pit-config.test.ts` | Model ID resolution, env var overrides, feature flags |
| Blockchain | `eas.test.ts`, `eas-errors.test.ts`, `attestation-links.test.ts` | EAS attestation, bytes32 validation, URL building |
| Utilities | `hash.test.ts`, `form-utils.test.ts`, `rate-limit.test.ts`, `response-formats.test.ts`, `response-lengths.test.ts`, `presets.test.ts`, `winner-votes-lib.test.ts`, `reactions-lib.test.ts` | Hashing, form data, rate limiting, response config, preset integrity |

### API Tests (24 files in `tests/api/`)

| Domain | Files | Scenarios |
|--------|-------|-----------|
| Bout engine | `run-bout.test.ts`, `run-bout-errors.test.ts`, `run-bout-params.test.ts`, `run-bout-credits.test.ts`, `run-bout-arena.test.ts`, `run-bout-tier.test.ts` | Validation, idempotency, error paths, credit gating, arena mode, tier access |
| Agents | `agents.test.ts`, `agents-create.test.ts`, `agents-tier.test.ts`, `clone-agent.test.ts` | CRUD, validation, tier-gated creation, cloning |
| Reactions | `reactions.test.ts`, `reactions-success.test.ts` | Validation, rate limiting (429), success |
| Votes | `winner-vote.test.ts`, `winner-vote-success.test.ts` | Validation, success |
| Platform | `newsletter.test.ts`, `newsletter-edge.test.ts`, `contact.test.ts`, `ask-the-pit.test.ts`, `byok-stash.test.ts`, `seed-agents.test.ts` | Signups, contact form, AI Q&A, BYOK, admin seeding |
| Billing | `webhook-subscription.test.ts`, `webhook-edge-cases.test.ts` | Subscription lifecycle, idempotency, edge cases |
| Security | `security-topic-length.test.ts`, `security-contact-validation.test.ts`, `security-admin-auth.test.ts` | Input bounds, validation, admin auth |

### Integration Tests (1 file)

`tests/integration/db.test.ts` — Requires `TEST_DATABASE_URL` env var; skipped when absent. Tests real DB operations: credit ledger, intro pool, referral credits. Includes full cleanup (deletes test rows in `afterAll`).

### E2E Tests (1 file)

`tests/e2e/bout.spec.ts` — Playwright test of the core user flow: navigate home, click "Enter", verify redirect to `/bout/...`, wait for streaming text (60s timeout). Skips when `CREDITS_ENABLED=true` (requires auth).

## Configuration

### Vitest (`vitest.config.ts`)

- Environment: `node`
- Includes: `tests/unit/**/*.test.ts`, `tests/api/**/*.test.ts`
- Path aliases: `@/*` via `vite-tsconfig-paths`
- **Coverage thresholds: 85%** on lines, functions, branches, statements
- Coverage targets: `lib/agent-dna.ts`, `lib/agent-prompts.ts`, `lib/credits.ts`, `lib/rate-limit.ts`, `lib/response-lengths.ts`, `lib/response-formats.ts`

### Playwright (`playwright.config.ts`)

- Test directory: `tests/e2e/`
- Timeout: 120s per test, 30s for assertions
- Workers: 1 (serial)
- Headless Chromium (supports `PLAYWRIGHT_CHROMIUM_PATH` override)
- Auto-starts dev server unless `BASE_URL` is set

## Conventions

### Naming

- Test files: `*.test.ts` for Vitest, `*.spec.ts` for Playwright
- Test labels use prefixes: `H1:`, `H2:` for happy paths; `U1:`, `U2:` for unhappy/edge cases

### Mocking Pattern

Each test file is self-contained with inline mock setup:

```typescript
const { mockDb, mockInsert } = vi.hoisted(() => { /* factory */ });
vi.mock('@/db', () => ({ requireDb: () => mockDb }));
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
```

Common mock helpers (`setupSelect()`, `setupInsert()`, `setupUpdate()`) are defined per-file using `vi.hoisted()`.

### Isolation

- `vi.resetModules()` in `beforeEach` when dynamic imports are used
- `catchRedirect`/`expectRedirect` helpers for testing server action redirects
- No shared test utility module — mocks are copy-pasted per file

## Design Decisions & Trade-offs

- **No shared test utilities** — Mock setup helpers are duplicated across ~60 test files. This maximizes isolation (no hidden shared state) but increases maintenance cost when DB mock patterns change. Extracting a `tests/helpers/` module with shared mock factories would reduce duplication. This is the most impactful improvement opportunity in the test layer.
- **No CI/CD pipeline** — The `test:ci` pnpm script defines the gate (`lint + typecheck + unit + integration`) but there are no `.github/workflows/` or equivalent config files. Tests run via Vercel's build pipeline implicitly. Adding a GitHub Actions workflow would provide pre-merge CI and branch protection.
- **Coverage targets are selective** — Only 6 critical lib modules have enforced 85% coverage. Other modules have no minimum. This focuses coverage enforcement on the highest-risk code (credits, hashing, rate limiting) without creating busywork for UI-adjacent modules.
- **Single E2E test** — One Playwright spec covers the happy path. This is appropriate for the current scale but leaves rendering regressions uncovered. Additional E2E specs for agent creation, leaderboard, and replay viewing would improve confidence.

---

[← Root](../README.md) · [App](../app/README.md) · [Lib](../lib/README.md) · [DB](../db/README.md)
