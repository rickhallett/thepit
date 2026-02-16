[← Root](../README.md)

# tests/

96 test files across 4 directories. Unit and API tests run via Vitest; E2E tests run via Playwright. Coverage thresholds are enforced at 85% on 11 critical lib modules. CI is enforced via GitHub Actions (`.github/workflows/ci.yml` for the gate, `.github/workflows/e2e.yml` for Playwright on Vercel preview deploys).

## Directory Structure

```
tests/
├── unit/               58 test files — pure function tests, mocked DB/external deps
├── api/                32 test files — API route handler tests with mocked deps
├── integration/         3 test files — real DB + security integration tests
│   ├── db.test.ts                    — real DB operations via TEST_DATABASE_URL
│   └── security/                     — auth bypass and race condition tests
└── e2e/                 3 test files — Playwright browser tests
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

### Unit Tests (55 files in `tests/unit/`)

| Domain | Files | What's Tested |
|--------|-------|---------------|
| Agent system | `agent-dna.test.ts`, `agent-dna-edge.test.ts`, `agent-prompts.test.ts`, `agent-registry.test.ts`, `agent-detail.test.ts`, `agent-detail-edge.test.ts`, `agent-lineage.test.ts`, `agent-mapper.test.ts`, `agent-links.test.ts` | Manifest hashing, prompt generation, registry resolution, lineage chain walking, row mapping, URL encoding |
| Credits & economy | `credits.test.ts`, `credits-settle.test.ts`, `credit-catalog.test.ts`, `intro-pool.test.ts`, `free-bout-pool.test.ts` | Cost computation, preauthorization, settlement (refund/charge/exact), pool mechanics |
| Users & auth | `users.test.ts`, `users-edge.test.ts`, `admin.test.ts`, `admin-auth.test.ts`, `referrals.test.ts`, `onboarding.test.ts` | User sync, profile refresh, email masking, admin checks, token auth, referral bonuses |
| Server actions | `actions.test.ts`, `actions-happy.test.ts` | All 8 server actions: auth guards, validation, Stripe flow, redirects |
| Tier system | `tier.test.ts`, `tier-helpers.test.ts` | Tier resolution, bout/model/agent access checks, daily limits |
| Leaderboard | `leaderboard.test.ts`, `leaderboard-edge.test.ts` | Multi-range aggregation, caching, division-by-zero guards |
| AI & prompts | `ai.test.ts`, `ai-env.test.ts`, `ask-the-pit-config.test.ts`, `xml-prompt.test.ts` | Model ID resolution, env var overrides, feature flags, XML prompt building, escaping, persona wrapping |
| Blockchain | `eas.test.ts`, `eas-errors.test.ts`, `attestation-links.test.ts` | EAS attestation, bytes32 validation, URL building |
| Bout & social | `bout-lineup.test.ts`, `short-links.test.ts`, `remix-events.test.ts` | Arena preset construction, short link creation/resolution, remix event recording |
| Research | `research-anonymize.test.ts`, `arxiv.test.ts` | User ID anonymization, arXiv URL parsing, metadata fetching |
| Brand & social | `brand.test.ts` | Brand constants, social link configuration, share text generation |
| Infrastructure | `async-context.test.ts`, `env.test.ts`, `ip.test.ts`, `logger.test.ts`, `context-budget.test.ts` | AsyncLocalStorage context, env validation, IP resolution, structured logging, context budget tracking |
| Utilities | `hash.test.ts`, `form-utils.test.ts`, `rate-limit.test.ts`, `response-formats.test.ts`, `response-lengths.test.ts`, `presets.test.ts`, `winner-votes-lib.test.ts`, `reactions-lib.test.ts`, `api-utils.test.ts`, `errors.test.ts`, `validation.test.ts` | Hashing, form data, rate limiting, response config, preset integrity, API utils, error handling, input validation |

### API Tests (32 files in `tests/api/`)

| Domain | Files | Scenarios |
|--------|-------|-----------|
| Bout engine | `run-bout.test.ts`, `run-bout-errors.test.ts`, `run-bout-params.test.ts`, `run-bout-credits.test.ts`, `run-bout-arena.test.ts`, `run-bout-tier.test.ts` | Validation, idempotency, error paths, credit gating, arena mode, tier access |
| REST API | `v1-bout.test.ts` | Public API v1 bout endpoint: auth, Lab tier gating, synchronous execution |
| Agents | `agents.test.ts`, `agents-create.test.ts`, `agents-tier.test.ts`, `clone-agent.test.ts` | CRUD, validation, tier-gated creation, cloning |
| Reactions | `reactions.test.ts`, `reactions-success.test.ts` | Validation, rate limiting (429), success |
| Votes | `winner-vote.test.ts`, `winner-vote-success.test.ts` | Validation, success |
| Short links | `short-links.test.ts`, `short-link-resolve.test.ts` | Creation, validation, rate limiting, redirect, click tracking |
| Community | `feature-requests.test.ts`, `feature-requests-vote.test.ts` | CRUD, validation, voting, deduplication |
| Research | `paper-submissions.test.ts`, `research-export.test.ts` | arXiv submissions, admin export generation, public download |
| Platform | `newsletter.test.ts`, `newsletter-edge.test.ts`, `contact.test.ts`, `ask-the-pit.test.ts`, `byok-stash.test.ts`, `seed-agents.test.ts` | Signups, contact form, AI Q&A, BYOK, admin seeding |
| Billing | `webhook-subscription.test.ts`, `webhook-edge-cases.test.ts` | Subscription lifecycle, idempotency, edge cases |
| Security | `security-topic-length.test.ts`, `security-contact-validation.test.ts`, `security-admin-auth.test.ts` | Input bounds, validation, admin auth |

### Integration Tests (3 files)

| File | Description |
|------|-------------|
| `db.test.ts` | Real DB operations: credit ledger, intro pool, referral credits. Requires `TEST_DATABASE_URL`; skipped when absent. Full cleanup in `afterAll`. |
| `security/auth-bypass.test.ts` | Authorization bypass testing: endpoint protection, token validation, timing-safe comparisons. |
| `security/race-conditions.test.ts` | Concurrent request handling: reaction deduplication, credit race conditions. |

### E2E Tests (3 files)

| File | Description |
|------|-------------|
| `bout.spec.ts` | Core user flow: navigate home, click "Enter", verify redirect to `/bout/...`, wait for streaming text (60s timeout). Skips when `CREDITS_ENABLED=true`. |
| `citations.spec.ts` | Research citations page: arXiv link validation (HTTP 200), inline anchor integrity, internal navigation. |
| `mobile-responsive.spec.ts` | Mobile viewport (iPhone 15): horizontal overflow checks, hamburger menu, filter bounds on /agents, /arena, /leaderboard. |

## Configuration

### Vitest (`vitest.config.ts`)

- Environment: `node`
- Includes: `tests/unit/**/*.test.ts`, `tests/api/**/*.test.ts`, `tests/integration/**/*.test.ts`
- Path aliases: `@/*` via `vite-tsconfig-paths`
- **Coverage thresholds: 85%** on lines, functions, branches, statements
- Coverage targets: `lib/agent-dna.ts`, `lib/agent-prompts.ts`, `lib/agent-registry.ts`, `lib/credits.ts`, `lib/free-bout-pool.ts`, `lib/rate-limit.ts`, `lib/referrals.ts`, `lib/response-formats.ts`, `lib/response-lengths.ts`, `lib/tier.ts`, `lib/validation.ts`

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

- **No shared test utilities** — Mock setup helpers are duplicated across ~88 test files. This maximizes isolation (no hidden shared state) but increases maintenance cost when DB mock patterns change. Extracting a `tests/helpers/` module with shared mock factories would reduce duplication. This is the most impactful improvement opportunity in the test layer.
- **CI enforced via GitHub Actions** — `.github/workflows/ci.yml` runs the full gate (lint + typecheck + unit + integration) on every push and PR. `.github/workflows/e2e.yml` runs Playwright against Vercel preview deployments on `deployment_status` events.
- **Coverage targets are selective** — 11 critical lib modules have enforced 85% coverage (agent-dna, agent-prompts, agent-registry, credits, free-bout-pool, rate-limit, referrals, response-formats, response-lengths, tier, validation). Other modules have no minimum. This focuses coverage enforcement on the highest-risk code without creating busywork for UI-adjacent modules.
- **Three E2E tests** — Playwright specs cover the core bout flow, citation validation, and mobile responsiveness. This is appropriate for the current scale but leaves some rendering regressions uncovered. Additional E2E specs for agent creation, leaderboard, and replay viewing would improve confidence.

---

[← Root](../README.md) · [App](../app/README.md) · [Lib](../lib/README.md) · [DB](../db/README.md)
