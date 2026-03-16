# Development Roadmap

Date: 2026-03-16
Updated: 2026-03-16
Status: Active
Sources: L1-L5 codebase review, Anthropic change propagation P1-P4, Gemini change propagation P1-P4, Codex change propagation P1-P4, 3-model triangulation

---

## Overview

This roadmap synthesises every actionable finding from the SD-328 codebase review into atomic, trackable items. Each item has a unique identifier, a convergence rating indicating how many independent review sources surfaced it, and a clear definition of what breaks if unfixed.

Convergence key: 3/3 = all three models found it independently (highest confidence). 2/3 = two models found it. 1/3 = single model found it (investigate before committing). L = found in the 6-layer review.

---

## Phase 0: Safety Net

Financial safety and data integrity. These items prevent money loss, data loss, or permanently stuck state. Non-negotiable.

### RD-001: Make intro pool deduction and user credit grant atomic [DONE - PR#75, 78d3ecc]

- **Source:** Gemini R3 (HIGH), Anthropic trace, Codex trace 7 | Convergence: 2/3 + L
- **Priority:** P0
- **Effort:** S
- **Files:** `lib/onboarding.ts`, `lib/intro-pool.ts`, `lib/credits.ts`
- **Description:** `applySignupBonus` calls `claimIntroCredits` (pool deduction) then `applyCreditDelta` (user grant) as two separate DB operations. If the second fails after the first succeeds, credits are permanently leaked from the finite intro pool without reaching the user.
- **Target:** Wrap both operations in a single `db.transaction()`. Update `claimIntroCredits` and `applyCreditDelta` to accept an optional `tx` parameter.
- **What breaks if unfixed:** Transient DB failure between the two operations permanently leaks credits from the intro pool. Silent. No reconciliation mechanism exists.

### RD-002: Add error handling to bout completion DB write [DONE - PR#76, faf4917]

- **Source:** Anthropic SMELL-03c + R4, Gemini trace 2 hop 6, Codex trace 1 hop 10 | Convergence: 3/3
- **Priority:** P0
- **Effort:** S
- **Files:** `lib/bout-engine.ts` (~line 1053-1063)
- **Description:** The final `UPDATE bouts SET status='completed', transcript=...` has no dedicated error handling. If this fails, the transcript is lost (user watched it stream live but replay shows nothing) and the bout remains in `running` status permanently. Credits already deducted.
- **Target:** Wrap in try/catch. On failure, log the full transcript as structured data to Sentry (the transcript is already in memory). Optionally retry once.
- **What breaks if unfixed:** DB connection hiccup at bout completion = total data loss for that bout + financial discrepancy. Low probability, high impact.

### RD-003: Add bout sweep job for stuck 'running' bouts [DONE - PR#77, 100f005]

- **Source:** L1-L5 review (preauth-settle gap), all 3 models identified stuck bout risk | Convergence: 3/3 + L
- **Priority:** P0
- **Effort:** M
- **Files:** New `lib/bout-sweep.ts`, new API route or cron trigger
- **Description:** Serverless function death between bout start and completion leaves bouts in `running` status permanently. No TTL, no sweep, no reconciliation. Users are charged (preauth) for bouts that never complete.
- **Target:** Implement a sweep job that marks bouts older than N minutes in `running` status as `error`, refunds preauthorized credits, and logs the incident. Trigger via cron or admin endpoint.
- **What breaks if unfixed:** Every serverless timeout or crash creates an orphaned bout. Credits stuck in preauth limbo. Accumulates silently.

### RD-004: Fix duplicate user_activated PostHog events

- **Source:** Codex R2 (unique finding) | Convergence: 1/3
- **Priority:** P1
- **Effort:** S
- **Files:** `lib/bout-engine.ts`, `db/schema.ts` (migration)
- **Description:** `bout-engine.ts` checks completed bout count after write to decide whether to emit `user_activated`. A race condition (two bouts completing near-simultaneously) can emit the event multiple times, corrupting the activation funnel.
- **Target:** Add `users.activatedAt` column. Use `UPDATE users SET activatedAt = NOW() WHERE activatedAt IS NULL AND id = ? RETURNING *` to atomically detect first activation. Emit only if RETURNING yields a row.
- **What breaks if unfixed:** Activation funnel analytics are inflated. Not a data-loss issue, but degrades the reliability of a key product metric.

---

## Phase 1: Error Handling and Observability

Missing error handling that produces bad UX or hides failures. Each item is a small, isolated change.

### RD-005: Wrap PostHog calls in Stripe webhook with try/catch

- **Source:** Anthropic SMELL-03b + R1, Gemini trace implicit | Convergence: 2/3
- **Priority:** P1
- **Effort:** S (5 lines)
- **Files:** `app/api/credits/webhook/route.ts` (~line 189-196)
- **Description:** `serverTrack` and `serverIdentify` are awaited without error handling. PostHog outage causes 500 response to Stripe, triggering retry cascade. DB writes are idempotent so retries are safe, but analytics fire N times and the webhook retry queue builds up.
- **Target:** Wrap the two await calls in try/catch. Log warning. Continue. Analytics loss is acceptable; webhook failure is not.
- **What breaks if unfixed:** PostHog API outage during a subscription event causes Stripe retry cascade. No financial harm (idempotent DB writes) but operational noise and duplicate analytics.

### RD-006: Add try/catch to createBout server action DB insert

- **Source:** Anthropic SMELL-03a + R2, Gemini trace 1 | Convergence: 2/3
- **Priority:** P1
- **Effort:** S (10 lines)
- **Files:** `app/actions.ts` (~line 89-98)
- **Description:** The `INSERT INTO bouts` call has no try/catch. DB failure produces an unhandled Next.js 500 with no useful error message.
- **Target:** Catch DB errors, redirect to `/arena?error=service-unavailable`. Display error in arena page.
- **What breaks if unfixed:** Transient Neon cold start or connection pool exhaustion produces a raw 500 error page. User has no idea what happened or how to recover.

### RD-007: Fix double-fault chain in api-logging.ts

- **Source:** L3 error path review | Convergence: L only
- **Priority:** P1
- **Effort:** S
- **Files:** `lib/api-logging.ts`
- **Description:** If the logger itself throws during error handling (e.g., structured logging serialization failure), the original error is masked. Total information loss on the one path where information matters most.
- **Target:** Wrap the logging call in its own try/catch that falls back to console.error with the original error.
- **What breaks if unfixed:** A logger bug during an API error silently swallows the original error. You see nothing in telemetry. The error might as well not have happened.

### RD-008: Surface error feedback for reaction and vote failures

- **Source:** Codex R1 (unique finding) | Convergence: 1/3
- **Priority:** P2
- **Effort:** S
- **Files:** `lib/use-bout-reactions.ts`, `components/arena.tsx`, `components/feature-request-list.tsx`
- **Description:** Reaction toggles and feature request votes revert optimistically on API failure without any user-visible feedback. Users think their input registered when it did not.
- **Target:** Expose error state from hooks. Render a minimal inline error or toast when API calls fail.
- **What breaks if unfixed:** Users' reactions and votes silently fail. Erodes trust in feedback loops. Particularly noticeable under rate limiting.

### RD-009: Investigate GREATEST(0) ledger/balance discrepancy

- **Source:** L4 state management audit | Convergence: L only
- **Priority:** P2
- **Effort:** S (investigation) / M (fix)
- **Files:** `lib/credits.ts`
- **Description:** The SQL expression `GREATEST(0, balance - amount)` in credit operations means the balance column can diverge from the sum of the credit_transactions ledger. The balance is clamped to 0 but the ledger records the full delta. Over time, this creates a silent discrepancy between the two sources of truth.
- **Target:** Investigate whether the discrepancy is intentional (preventing negative balances) or a bug. If intentional, document. If not, fix the SQL expression or add a reconciliation check.
- **What breaks if unfixed:** The balance column and the ledger tell different stories. Makes debugging credit issues harder. May mask actual credit leaks.

---

## Phase 2: Structural Decomposition

Breaking apart god modules and consolidating duplicated logic. Each item is a refactor that does not change external behaviour.

### RD-010: Decompose bout-engine.ts into focused modules

- **Source:** Anthropic R5, Gemini smell, Codex R4 | Convergence: 3/3
- **Priority:** P1
- **Effort:** M
- **Files:** `lib/bout-engine.ts` (1274 lines, 22 imports) -> new files
- **Description:** The engine handles validation, auth, tier checking, rate limiting, credit preauthorization, BYOK key reading, model selection, prompt construction, LLM streaming, transcript assembly, share line generation, DB persistence, credit settlement, analytics, and error recovery. All in one file.
- **Target:** Extract into:
  - `lib/bout-validation.ts` - `validateBoutRequest()` (~340 lines)
  - `lib/bout-execution.ts` - `executeBout()` / turn loop (~730 lines)
  - `lib/bout-settlement.ts` - credit settlement, analytics, cleanup
  - `lib/bout-engine.ts` - re-exports from all three, maintains backward compatibility
- **What breaks if unfixed:** Every change to the bout flow risks touching a 1274-line file with 22 dependencies. The blast radius of any change is the entire file. Primary velocity constraint for bout-related features.

### RD-011: Extract bout loading into lib/bouts.ts

- **Source:** Anthropic R3 | Convergence: 1/3 + L
- **Priority:** P2
- **Effort:** S
- **Files:** `app/bout/[id]/page.tsx`, `app/b/[id]/page.tsx`, `lib/bout-engine.ts` -> new `lib/bouts.ts`
- **Description:** `SELECT * FROM bouts WHERE id = ?` exists inline in 3 places (two pages + engine). No shared query abstraction.
- **Target:** Create `lib/bouts.ts` with `getBoutById(id)`. Update 3-4 import sites.
- **What breaks if unfixed:** If the bout query needs to change (soft-delete filter, select columns), each call site must be found and updated independently.

### RD-012: Extract webhook business logic into lib/billing.ts

- **Source:** Anthropic SMELL-02, Gemini trace 4 | Convergence: 2/3
- **Priority:** P2
- **Effort:** M
- **Files:** `app/api/credits/webhook/route.ts` -> new `lib/billing.ts`
- **Description:** The Stripe webhook handler contains tier resolution logic, monthly grant rules, and raw DB queries. Domain rules leak into the routing layer.
- **Target:** Move business logic into `lib/billing.ts`. Webhook handler becomes a thin transport layer: verify signature, parse event, delegate to billing service, return 200.
- **What breaks if unfixed:** Adding a new billing tier (e.g., enterprise) requires modifying an HTTP transport handler. The domain rule and the routing concern are entangled.

### RD-013: Consolidate agent snapshot resolution

- **Source:** Anthropic SMELL-05b | Convergence: 1/3
- **Priority:** P3
- **Effort:** S
- **Files:** `lib/agent-registry.ts`, `lib/agent-detail.ts`, `lib/leaderboard.ts`
- **Description:** Agent snapshots are assembled by merging DB records with static preset definitions. The same resolution logic runs in `getAgentSnapshots`, `findAgentById`, `getAgentDetail`, and leaderboard aggregation. Four independent query-and-resolve paths.
- **Target:** Single `resolveAgentSnapshot()` function used by all consumers. Optional caching layer.
- **What breaks if unfixed:** A change to agent resolution logic (e.g., new field, new merge rule) must be updated in 4 places. Divergence risk.

### RD-014: Consolidate environment variable access

- **Source:** Anthropic R8 | Convergence: 1/3
- **Priority:** P3
- **Effort:** M (incremental, one file at a time)
- **Files:** 24 lib files that read `process.env` directly, `lib/env.ts`
- **Description:** `lib/env.ts` provides Zod validation for most vars, but 24 files also read `process.env` directly for feature flags and config.
- **Target:** All env access through `lib/env.ts`. Feature flags via `env.flags`. Config via `env.config`. No `process.env` reads outside `env.ts`.
- **What breaks if unfixed:** Setting up a new environment (staging, preview, new developer) requires reading `env.ts` plus scanning all files for `process.env`. Missing a var causes a runtime error, not a startup failure.

---

## Phase 3: Data Access and Boundaries

Establishing a proper data access layer. This is the "durian" - conceptually simple, high blast radius.

### RD-015: Extract DB queries from app/ into lib/ (establish DAL)

- **Source:** Anthropic SMELL-01, Gemini R2, Codex leakage assessment | Convergence: 3/3
- **Priority:** P2
- **Effort:** L
- **Files:** `app/actions.ts`, `app/bout/[id]/page.tsx`, `app/b/[id]/page.tsx`, `app/sitemap.ts`, `app/api/credits/webhook/route.ts`, `app/api/agents/route.ts` -> lib/ functions
- **Description:** 6 page/route files import `@/db/schema` directly and execute raw Drizzle queries, bypassing the lib/ domain layer. The schema IS the interface. Any schema change propagates directly into the UI/routing layer.
- **Target:** Every `app/` file imports only from `lib/`. All Drizzle queries live in lib/ functions. `app/` becomes a thin transport/rendering layer.
- **What breaks if unfixed:** Database schema changes (column rename, type change, new table structure) require editing UI pages and API route handlers. The coupling makes schema evolution expensive and error-prone.

### RD-016: Remove direct db/schema type imports from components/

- **Source:** Codex specific finding (components -> db tight coupling via TranscriptEntry) | Convergence: 1/3
- **Priority:** P3
- **Effort:** S
- **Files:** `components/arena.tsx` (imports `TranscriptEntry` from `@/db/schema`)
- **Description:** Component layer directly imports database schema types. The type dependency is real even though it's type-only at runtime.
- **Target:** Re-export needed types from a lib/ types file or from the relevant domain module. Components import from lib/, not db/.
- **What breaks if unfixed:** Schema type rename requires editing component files. Minor coupling but violates the boundary model.

### RD-017: Make agent slot check atomic

- **Source:** Anthropic R6 | Convergence: 1/3
- **Priority:** P3
- **Effort:** S
- **Files:** `app/api/agents/route.ts` (~line 176-192)
- **Description:** Agent creation counts existing agents then inserts a new one. Two concurrent requests can both pass the count check and exceed the slot limit. Count-then-insert is not atomic.
- **Target:** Wrap count + insert in a transaction with `SELECT FOR UPDATE`, or add a DB-level check constraint.
- **What breaks if unfixed:** A user can exceed their agent slot limit via concurrent requests. Low exploitability for manual use, trivial for a script.

---

## Phase 4: Infrastructure and Scale

Preparing for horizontal scaling. These items are not urgent at current scale but become correctness problems under load.

### RD-018: Replace in-memory leaderboard cache with distributed cache

- **Source:** Anthropic (noted), Gemini R1 (HIGH), Codex (decision log) | Convergence: 3/3
- **Priority:** P2
- **Effort:** M
- **Files:** `lib/leaderboard.ts` (module-level `leaderboardCache`)
- **Description:** Leaderboard data is cached in a module-scoped variable with 5-minute TTL. In horizontal serverless environments, different instances hold different derived states. Users see inconsistent leaderboards depending on which instance serves their request.
- **Target:** Introduce `lib/cache.ts` wrapping a distributed cache (Upstash Redis or Vercel KV). Replace module-level variable with async cache read/write.
- **What breaks if unfixed:** At current single-instance scale: nothing. At horizontal scale: users see different leaderboards depending on which serverless instance serves the request.

### RD-019: Replace in-memory onboarding cache with distributed cache

- **Source:** Anthropic (noted), Gemini (flagged), Codex (noted) | Convergence: 3/3
- **Priority:** P2
- **Effort:** S (shares lib/cache.ts from RD-018)
- **Files:** `lib/onboarding.ts` (module-level Map, 1hr TTL)
- **Description:** Onboarding idempotency check uses an in-memory Map. At horizontal scale, different instances may re-run onboarding for the same user (the DB dedup layer catches this, but the extra DB queries add latency and load).
- **Target:** Use distributed cache from RD-018.
- **What breaks if unfixed:** At horizontal scale: onboarding DB queries run on every request for recently-onboarded users routed to a different instance. DB dedup prevents correctness issues but adds unnecessary load.

### RD-020: Evaluate distributed rate limiting

- **Source:** Anthropic D1, Gemini implicit, Codex D2 | Convergence: 3/3 (all acknowledge, all defer)
- **Priority:** P3
- **Effort:** M
- **Files:** `lib/rate-limit.ts`
- **Description:** Rate limiter is per-serverless-instance. A determined attacker hitting different instances bypasses the limit. All three models note this is intentional at current scale because DB constraints (unique indexes, atomic conditional updates, preauthorization) serve as the authoritative enforcement layer.
- **Target:** Evaluate Upstash Redis rate limiting when RD-018 introduces a distributed cache. The marginal cost of adding rate limiting to an existing Redis connection is low.
- **What breaks if unfixed:** Rate limit bypass is possible. Financial exposure is capped by the preauth/settle pattern. Revisit when bypass causes measurable financial impact.

---

## Phase 5: Hygiene and Feature Enablement

Dead code removal, dead table cleanup, and structural preparation for future features.

### RD-021: Add post-completion hook point to bout-engine

- **Source:** Anthropic R7 | Convergence: 1/3 (but all 3 models identified tournament difficulty)
- **Priority:** P2
- **Effort:** S
- **Files:** `lib/bout-engine.ts`
- **Description:** Bout completion updates a DB row and fires analytics. Nothing else is notified. The engine has no extension point for downstream effects. Tournaments (Issue #14) require knowing when a bout finishes.
- **Target:** Add an optional callback parameter to `executeBout()`: `onBoutCompleted(boutId, transcript, metadata)`. Default to no-op. Call after the completion DB write.
- **What breaks if unfixed:** Tournament brackets become structurally difficult. The only alternative is polling the bouts table for status changes (fragile, latency). This is the key structural blocker for the next major feature.

### RD-022: Remove dead table free_bout_pool

- **Source:** Anthropic Phase 1, Codex R3 | Convergence: 2/3
- **Priority:** P3
- **Effort:** S
- **Files:** `db/schema.ts`, `drizzle/` (migration)
- **Description:** `free_bout_pool` table exists in schema but has no runtime readers or writers. Legacy remnant replaced by intro pool.
- **Target:** Drop table via migration. Remove from schema.
- **What breaks if unfixed:** Schema carries dead weight. Future reviewers cannot tell which tables are real.

### RD-023: Remove dead table agent_flags

- **Source:** Anthropic Phase 1 | Convergence: 1/3
- **Priority:** P3
- **Effort:** S
- **Files:** `db/schema.ts`, `drizzle/` (migration)
- **Description:** `agent_flags` table exists in schema with no active readers or writers in the codebase.
- **Target:** Drop table via migration. Remove from schema.
- **What breaks if unfixed:** Same as RD-022. Dead schema surface area.

### RD-024: Clean up dead exports in agent cluster

- **Source:** L2-B API surface audit | Convergence: L only
- **Priority:** P3
- **Effort:** S
- **Files:** `lib/agent-registry.ts`, `lib/agent-mapper.ts`
- **Description:** 3 exported functions in the agent cluster have no consumers. They were likely written for features that were never completed or were refactored away.
- **Target:** Remove dead exports. Verify with grep/tsc that no consumers exist.
- **What breaks if unfixed:** Dead code creates false API surface. New agents may assume these functions are live and build on them.

### RD-025: Reduce app/actions.ts coordination scope

- **Source:** Gemini Phase 3 (unique finding) | Convergence: 1/3
- **Priority:** P3
- **Effort:** M
- **Files:** `app/actions.ts`
- **Description:** `app/actions.ts` coordinates across 10+ distinct domains (bouts, agents, credits, subscriptions, billing portal, admin). Gemini identified it as a second god module alongside bout-engine. Actions directly import DB schema and execute raw queries.
- **Target:** After RD-015 (DAL extraction) and RD-012 (billing extraction), actions.ts should become thin delegation to lib/ functions. Each action: validate input, call lib function, redirect.
- **What breaks if unfixed:** Adding a new server action means editing a file that touches every domain. Risk of unrelated changes.

---

## Phase Summary

| Phase | Items | Priority Range | Effort Range | Theme |
|-------|-------|---------------|-------------|-------|
| 0: Safety Net | RD-001 to RD-004 | P0-P1 | S-M | Financial safety, data integrity |
| 1: Error Handling | RD-005 to RD-009 | P1-P2 | S | Error handling, observability, UX |
| 2: Structural | RD-010 to RD-014 | P1-P3 | S-M | Decomposition, consolidation |
| 3: Data Access | RD-015 to RD-017 | P2-P3 | S-L | DAL, boundary enforcement |
| 4: Infrastructure | RD-018 to RD-020 | P2-P3 | S-M | Distributed caching, rate limiting |
| 5: Hygiene | RD-021 to RD-025 | P2-P3 | S-M | Dead code, hooks, cleanup |

Total: 25 items (4 P0, 5 P1, 9 P2, 7 P3)

---

## Convergence Summary

| Convergence Level | Count | Items |
|-------------------|-------|-------|
| 3/3 (all models) | 7 | RD-002, RD-003, RD-010, RD-015, RD-018, RD-019, RD-020 |
| 2/3 (two models) | 6 | RD-001, RD-005, RD-006, RD-012, RD-022, RD-008 (BYOK) |
| 1/3 (single model) | 7 | RD-004, RD-008, RD-011, RD-013, RD-017, RD-021, RD-023 |
| L only (6-layer review) | 5 | RD-007, RD-009, RD-014, RD-016, RD-024 |

---

## Dependency Graph

Some items have ordering dependencies:

```
RD-018 (distributed cache) -> RD-019 (onboarding cache, shares lib/cache.ts)
RD-018 -> RD-020 (evaluate distributed rate limiting on same Redis)
RD-010 (bout-engine decomp) -> RD-021 (post-completion hook, cleaner in decomposed module)
RD-015 (DAL extraction) -> RD-025 (actions.ts reduction, requires DAL to exist)
RD-015 -> RD-016 (component type imports, same pattern)
```

Items within Phase 0 and Phase 1 are independent of each other and can be parallelised.

---

## Design Decisions to Preserve

These are intentional tradeoffs documented during the review. Future work must not "fix" these without re-evaluating the tradeoff.

| ID | Decision | Documented By | Revisit When |
|----|----------|--------------|-------------|
| DD-01 | In-memory rate limiter (not distributed) | Anthropic D1, Codex D2 | Rate limit bypass causes measurable financial impact |
| DD-02 | Full leaderboard payload sent to client | Anthropic D2 | 1000+ entries per range |
| DD-03 | JavaScript-side leaderboard aggregation | Anthropic D3 | Cold-cache load exceeds 2 seconds |
| DD-04 | Bout row triple-creation (action + page backfill + engine ensure) | Anthropic D4 | Fourth creation point needed |
| DD-05 | BYOK key transport via HTTP-only cookie | Anthropic D5 | Never |
| DD-06 | Two PostHog patterns (server captureImmediate vs client batch) | Anthropic D6 | Move to long-running server |
| DD-07 | AsyncLocalStorage for request context | Anthropic D7 | Move to edge runtime |
| DD-08 | HTTP redirects inside server actions (Next.js idiom) | Gemini D1 | Expose actions as REST/GraphQL API |
| DD-09 | Mixed UI mechanisms (server actions + fetch + SSE) | Codex D1 | Unified RPC layer introduced |

---

## Provenance

This roadmap was produced by triangulating three independent change propagation analyses (Anthropic, Gemini, Codex) against a 6-layer codebase review (L1-L5). The methodology is documented in `docs/internal/audits/change-propagation-methodology.md`. The review model is documented in `docs/internal/weaver/codebase-review-model.md`.

Individual source documents:
- `docs/internal/weaver/l1-dependency-map.md` through `l5-change-impact-analysis.md`
- `docs/internal/audits/change-propagation-phase1.md` through `phase4.md` (Anthropic)
- `docs/internal/audits/gemini-change-propagation-phase1.md` through `phase4.md` (Gemini)
- `docs/internal/audits/change-propagation-phase1-codex.md` through `phase4-codex.md` (Codex)
