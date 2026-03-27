# Code Review Action Plan

**Date:** 2026-02-13
**Source:** Two code reviews (launch readiness + architectural quality)
**Branch:** `staging` (from `master`)

---

## PR Strategy

Changes are grouped into **4 PRs** by risk profile and blast radius. Each PR is independently verifiable and can be reverted without affecting the others.

| PR | Branch | Scope | Risk | Files |
|----|--------|-------|------|-------|
| **PR 1** | `fix/context-window-safety` | P0 critical: context window budgeting + IP consistency fix | High (bout engine) | ~6 |
| **PR 2** | `feat/env-validation` | Fail-fast env validation + AsyncLocalStorage request context | Medium (startup, logging) | ~10 |
| **PR 3** | `refactor/ui-primitives` | UI primitive extraction + Arena decomposition | Low (pure UI) | ~15 |
| **PR 4** | `refactor/db-integrity` | Foreign key migration + repository pattern foundation | Medium (schema, data access) | ~15 |

---

## PR 1: Context Window Safety + IP Fix

**Branch:** `fix/context-window-safety`
**Why first:** P0 — unbounded context growth can exceed model limits and cause cost overruns in production. IP inconsistency is a security bug.

### Action 1.1: Context Window Budgeting

**Problem:** `lib/bout-engine.ts` sends the full transcript every turn via `buildUserMessage()`. No truncation or token budget exists. Long bouts with `long` response settings can exceed model context limits or blow past pre-authorized credit amounts.

**Implementation:**

1. **Add model context limits** to `lib/ai.ts`:
   ```typescript
   export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
     'claude-haiku-4-5-20251001': 200000,
     'claude-sonnet-4-5-20250929': 200000,
     'claude-opus-4-5-20251101': 200000,
     'claude-opus-4-6': 200000,
   };
   export const CONTEXT_BUDGET_RATIO = 0.85; // reserve 15% for system prompt + safety margin
   ```

2. **Add token estimation to `lib/xml-prompt.ts`**:
   ```typescript
   export function estimatePromptTokens(parts: { system: string; user: string }): number {
     return Math.ceil((parts.system.length + parts.user.length) / 4);
   }
   ```

3. **Add sliding window truncation in `lib/bout-engine.ts`**:
   - Before calling `streamText`, estimate total prompt tokens (system + user with full history).
   - If over budget, truncate history from the front (keep most recent turns).
   - Add a `[Earlier turns truncated]` marker when truncation occurs.
   - Log a warning when truncation happens with `{ requestId, boutId, turnsDropped, estimatedTokens }`.

4. **Add a hard guard**: if even after truncation the prompt exceeds the limit (e.g., a single turn is enormous), fail gracefully with a user-facing error rather than sending to the API.

**Tests:**
- Unit test: `tests/unit/context-budget.test.ts` — verify truncation logic triggers at threshold, preserves recent turns, inserts marker.
- Unit test: verify hard guard throws on oversized single turn.
- Update existing bout-engine tests to cover the new path.

### Action 1.2: IP Resolution Consistency

**Problem:** `middleware.ts` uses `forwarded.split(',')[0]` (leftmost, client-controlled) while `lib/rate-limit.ts` uses rightmost (proxy-appended). Two different IP resolution strategies in production.

**Implementation:**

1. **Create `lib/ip.ts`** with a single canonical IP extraction function:
   ```typescript
   export function resolveClientIp(headers: Headers): string {
     // Vercel-specific trusted header first
     const vercelIp = headers.get('x-vercel-forwarded-for');
     if (vercelIp) return vercelIp.split(',')[0].trim();
     // Standard: rightmost entry is the one appended by the trusted proxy
     const forwarded = headers.get('x-forwarded-for');
     if (forwarded) {
       const parts = forwarded.split(',').map(s => s.trim());
       return parts[parts.length - 1];
     }
     return headers.get('x-real-ip') ?? 'unknown';
   }
   ```

2. **Update `middleware.ts`** to use `resolveClientIp()` instead of inline extraction.

3. **Update `lib/rate-limit.ts`** `getClientIdentifier()` to use `resolveClientIp()`.

4. **Remove duplicate IP logic** from both files.

**Tests:**
- Unit test: `tests/unit/ip.test.ts` — verify extraction from various header combinations (Vercel, standard proxy, direct, spoofed).

---

## PR 2: Env Validation + Request Context

**Branch:** `feat/env-validation`
**Why second:** Prevents runtime crashes from missing config. ALS cleans up logging throughout the codebase.

### Action 2.1: Fail-Fast Environment Validation

**Problem:** 65+ env vars accessed via raw `process.env` with ad-hoc defaults. Missing critical vars (e.g., `STRIPE_SECRET_KEY`) cause runtime crashes, not startup failures.

**Implementation:**

1. **Install `zod`** (no `t3-env` — we want to keep deps minimal and zod is more versatile):
   ```bash
   pnpm add zod
   ```

2. **Create `lib/env.ts`**:
   - Define Zod schemas for server-side and client-side env vars.
   - Group by category: required, feature flags, credits, stripe, observability, etc.
   - Parse and validate at module load time. Export typed `env` object.
   - In production, throw on missing required vars. In development, warn for optional vars.
   - Replace all `process.env.*` access across lib files with imports from `lib/env.ts`.

3. **Migration strategy**: Since 19 files use raw `process.env`, migrate them incrementally:
   - First pass: create `lib/env.ts` with the schema and export validated values.
   - Second pass: update all `lib/*.ts` imports to use `env.*` instead of `process.env.*`.
   - Do NOT change `app/` route files that only access `NEXT_PUBLIC_*` client vars (those are handled by Next.js bundler).

**Tests:**
- Unit test: `tests/unit/env.test.ts` — verify validation catches missing required vars, applies defaults correctly, coerces types.
- Verify existing tests still pass (they mock env vars via `vi.stubEnv`).

### Action 2.2: AsyncLocalStorage Request Context

**Problem:** `requestId` is manually threaded through function signatures. If a deep function forgets to pass it, log correlation breaks.

**Implementation:**

1. **Create `lib/async-context.ts`**:
   ```typescript
   import { AsyncLocalStorage } from 'node:async_hooks';

   export type RequestContext = {
     requestId: string;
     clientIp: string;
     userId?: string;
   };

   export const requestStore = new AsyncLocalStorage<RequestContext>();

   export function getContext(): RequestContext | undefined {
     return requestStore.getStore();
   }
   ```

2. **Update `lib/api-logging.ts`** (`withLogging`):
   - Wrap the handler call in `requestStore.run({ requestId, clientIp }, () => handler(req))`.
   - This makes context implicitly available to all downstream code.

3. **Update `lib/logger.ts`**:
   - Import `getContext()`. In the log output function, auto-inject `requestId` and `clientIp` from the store if present (and not already supplied in the context arg).
   - This is a non-breaking change: explicit `{ requestId }` in log calls still works but is no longer required.

4. **Clean up manual threading** in `lib/bout-engine.ts` and other files where `requestId` is explicitly passed just for logging.

**Tests:**
- Unit test: `tests/unit/async-context.test.ts` — verify store is accessible within `run()`, returns undefined outside.
- Unit test: verify logger auto-injects requestId from store.

---

## PR 3: UI Primitives + Arena Decomposition

**Branch:** `refactor/ui-primitives`
**Why third:** Pure frontend refactor with zero backend risk. Improves maintainability.

### Action 3.1: Extract UI Primitives

**Problem:** Button, badge, and card patterns are duplicated across components with inconsistent Tailwind classes (e.g., `border-foreground/60` vs `border-foreground/70`).

**Implementation:**

1. **Create `components/ui/` directory** with three primitives:

   - **`components/ui/button.tsx`**: Consolidate the brutalist button pattern. Props: `variant` (primary, secondary, ghost), `size` (sm, md, lg), standard HTML button props. Extract the uppercase tracking pattern (`text-xs uppercase tracking-[0.3em]`).

   - **`components/ui/badge.tsx`**: Consolidate the tier/status badge pattern. Props: `variant` (default, accent, muted), `size` (sm, md). Extract the rounded-full border pattern.

   - **`components/ui/card.tsx`**: Consolidate the bordered card pattern used in preset cards, bout cards, etc. Props: `variant` (default, interactive), padding options.

2. **Migrate existing components** to use the primitives:
   - `components/preset-card.tsx` — replace inline button and badge styles.
   - `components/buy-credits-button.tsx` — replace inline button styles.
   - `components/header.tsx` — replace nav link button styles.
   - Other components as applicable (audit during implementation).

### Action 3.2: Arena Decomposition

**Problem:** `components/arena.tsx` is 591 lines with 13 state variables mixing layout, streaming, reactions, voting, sharing, and engagement tracking.

**Implementation:**

1. **Extract custom hooks**:
   - `lib/use-bout-engagement.ts` — scroll depth tracking, active time, turns watched. Move the 3 refs and engagement `useEffect` from arena.
   - `lib/use-bout-voting.ts` — winner vote state, submit handler, error/pending state. Move `userVote`, `voteError`, `votePending` state + vote submission logic.
   - `lib/use-bout-reactions.ts` — reaction counts fetch, optimistic update, submit handler. Move `reactions` state + reaction API calls.
   - `lib/use-bout-sharing.ts` — share URL generation, short link fetch, copy handlers. Move `shareUrl`, `shortSlug`, `copied`, `copiedMessageId` state.

2. **Extract sub-components**:
   - `components/bout-stream.tsx` — transcript message list with auto-scroll. Receives messages + activeAgentId.
   - `components/bout-controls.tsx` — voting UI + share buttons. Receives voting/sharing hook state.
   - `components/bout-header.tsx` — status badge + agent chips + metadata.

3. **Slim `arena.tsx`** to a layout container composing the sub-components and hooks. Target: under 150 lines.

**Tests:**
- No new unit tests needed (hooks delegate to existing API calls).
- Verify existing E2E `bout.spec.ts` still passes (it tests the full arena flow).
- Manual visual regression check.

---

## PR 4: DB Integrity + Repository Foundation

**Branch:** `refactor/db-integrity`
**Why last:** Schema changes require a migration and careful testing. Repository pattern is the largest refactor.

### Action 4.1: Foreign Key Constraints

**Problem:** Only 1 of ~15 relationships has a foreign key constraint. Orphaned data is possible on deletion.

**Implementation:**

1. **Create migration `db/migrations/0005_add_foreign_keys.sql`**:
   Add foreign keys with `ON DELETE CASCADE` or `ON DELETE SET NULL` as appropriate:

   | Child Table | Column | Parent | ON DELETE |
   |-------------|--------|--------|-----------|
   | `bouts` | `ownerId` | `users.id` | SET NULL |
   | `credits` | `userId` | `users.id` | CASCADE |
   | `credit_transactions` | `userId` | `users.id` | CASCADE |
   | `reactions` | `boutId` | `bouts.id` | CASCADE |
   | `reactions` | `userId` | `users.id` | CASCADE |
   | `winner_votes` | `boutId` | `bouts.id` | CASCADE |
   | `winner_votes` | `userId` | `users.id` | CASCADE |
   | `referrals` | `referrerId` | `users.id` | CASCADE |
   | `referrals` | `referredId` | `users.id` | CASCADE |
   | `agents` | `ownerId` | `users.id` | SET NULL |
   | `agents` | `parentId` | `agents.id` | SET NULL |
   | `short_links` | `boutId` | `bouts.id` | CASCADE |
   | `feature_request_votes` | `featureRequestId` | `feature_requests.id` | CASCADE |
   | `remix_events` | `sourceAgentId` | `agents.id` | SET NULL |
   | `remix_events` | `remixedAgentId` | `agents.id` | SET NULL |

2. **Update `db/schema.ts`** to add `.references()` constraints matching the migration.

3. **Data cleanup query**: Before applying the migration, generate a script to identify and handle orphaned rows (e.g., `DELETE FROM reactions WHERE boutId NOT IN (SELECT id FROM bouts)`).

**Tests:**
- Integration test: verify FK constraint prevents inserting a reaction with a non-existent boutId.
- Run full test suite to ensure no tests rely on orphan-friendly behavior.

### Action 4.2: Repository Pattern Foundation

**Problem:** Drizzle queries are scattered across 19 lib files. Column renames require find-and-replace across the codebase. Business logic and data access are co-located.

**Implementation:**

1. **Create `lib/repos/` directory** with repositories for the most-accessed tables:
   - `lib/repos/bouts.repo.ts` — `create`, `findById`, `markComplete`, `findRunningByOwner`, `countDailyByOwner`
   - `lib/repos/credits.repo.ts` — `ensureAccount`, `getBalance`, `applyDelta`, `preauthorize`, `settle`, `getTransactions`
   - `lib/repos/users.repo.ts` — `findById`, `upsertFromClerk`, `getTier`, `incrementFreeBouts`
   - `lib/repos/agents.repo.ts` — `create`, `findById`, `archive`, `restore`, `findByOwner`
   - `lib/repos/reactions.repo.ts` — `upsert`, `getCountsForBout`
   - `lib/repos/votes.repo.ts` — `cast`, `getCountsForBout`

2. **Repository pattern**: Each repo exports a plain object with async methods. Internally calls `requireDb()`. Returns typed DTOs (not raw Drizzle row types).

3. **Migrate callers incrementally**:
   - Start with `lib/credits.ts`: move DB functions to `lib/repos/credits.repo.ts`, keep pure math functions in `lib/credits.ts`.
   - Then `lib/tier.ts`: move DB queries to `lib/repos/users.repo.ts`.
   - Then `lib/bout-engine.ts`: replace inline bout queries with `BoutRepo.*`.
   - Route handlers in `app/api/` that do direct DB access: migrate to repo calls.

4. **Do NOT introduce DI/interfaces yet**: The repos call `requireDb()` directly. Dependency injection is a separate, later refactor. The goal here is to centralize data access, not to abstract it.

**Tests:**
- Existing tests continue to mock `@/db` at the module level — this still works since repos import from `@/db` too.
- Add repo-specific tests: `tests/unit/repos/credits.repo.test.ts`, etc.

---

## Deferred Items (Not In This Round)

The following review recommendations are acknowledged but deferred to a future cycle:

| Item | Review Source | Reason for Deferral |
|------|-------------|---------------------|
| **Redis rate limiting** | Review 1 (P0) | Requires infrastructure (Upstash subscription, env config). Documented as known risk — in-memory limiter has a comment acknowledging the limitation. Current DB constraints + Vercel's own DDoS protection provide partial coverage. |
| **LLM Provider abstraction** | Both reviews | Premature until a second provider is needed. Current Anthropic coupling is via Vercel AI SDK which is already provider-agnostic at the streaming layer. |
| **Bout engine decomposition** (BoutManager/StreamCoordinator/Ledger) | Review 2 | The 673-line file is well-structured with two clear phases. Breaking it further is a refactor of convenience, not necessity. |
| **Leaderboard caching** (materialized view / Redis) | Review 1 | 5-minute in-memory TTL is adequate for launch traffic. Monitor before optimizing. |
| **Shared config codegen** (TS/Go SSOT) | Review 2 | Go pricing already has 13 parity tests. Manual sync is acceptable at current scale. |
| **Soft deletes** | Review 2 | FK constraints (PR 4) solve the immediate orphan problem. Soft deletes are a product decision. |

---

## Execution Order

```
master
  └─ staging
       ├─ fix/context-window-safety   → PR 1 (merge first)
       ├─ feat/env-validation          → PR 2 (merge second)
       ├─ refactor/ui-primitives       → PR 3 (merge third)
       └─ refactor/db-integrity        → PR 4 (merge last)
```

Each PR branches from staging after the previous one is merged, so they build on each other cleanly.

---

## Verification Gate

Each PR must pass before merge:
- `pnpm run lint` — 0 errors
- `pnpm run typecheck` — clean
- `pnpm run test:unit` — 668+ tests passing (may grow with new tests)
- Manual review of any visual changes (PR 3)
