# Change Propagation Analysis - Phase 4 (codex)

Version: 1.0
Date: 2026-03-16
Scope: Phase 4 architectural assessment for The Pit

---

## 4.1 Health Summary

- Dominant propagation pattern: request-response with direct DB mutation, plus event propagation for SSE and webhooks. This is appropriate for a Next.js monolith with limited background processing.
- Boundary integrity score: 5/8. Clean boundaries at components to app, app to lib, components to lib, middleware to copy-edge, and Go CLIs to shared. Leaky boundaries at app to db, components to db types, and lib to db.
- Failure resilience: 30/36 hops have explicit error handling or logged rollback behavior. Gaps are concentrated in client engagement flows that revert optimistically without user feedback.
- Change readiness: moderate. Core bout execution is centralized and powerful but large. Feature-level changes are straightforward; cross-cutting changes to rate limiting or streaming require careful refactors.

---

## 4.2 Prioritized Recommendations

### 1) Add user-visible error feedback for reaction and feature vote failures

- Current state: reaction and feature vote flows revert optimistically without a user-facing error message.
- Target state: surface a minimal error toast or inline message when API calls fail or rate limit.
- Mechanism: keep optimistic updates but add error display and retry affordance.
- Migration path: update `lib/use-bout-reactions.ts` to expose error state and update `components/arena.tsx` to render it; update `components/feature-request-list.tsx` to show an inline error on failed vote and revert state only after display.
- What breaks if unfixed: users think votes and reactions register when they do not, eroding trust in feedback loops.

### 2) Make user activation tracking atomic

- Current state: `lib/bout-engine.ts` checks completed bout count after write, with a known race that can emit duplicate `user_activated` events.
- Target state: add `users.activatedAt` and set it atomically on first activation.
- Mechanism: DB migration plus `UPDATE users SET activatedAt = NOW() WHERE activatedAt IS NULL AND id = ... RETURNING`.
- Migration path: add column in `db/schema.ts` and `drizzle` migration; replace count query in `lib/bout-engine.ts` with atomic update and use the returned row to decide whether to emit.
- What breaks if unfixed: analytics duplication persists and activation funnel accuracy degrades.

### 3) Resolve dead state for `free_bout_pool`

- Current state: table exists in `db/schema.ts` but there is no runtime usage.
- Target state: either remove the table and migration artifacts or reintroduce runtime usage with clear ownership.
- Mechanism: schema migration to drop the table, or reintroduce use in `lib/bout-engine.ts` with tests.
- Migration path: if removal is chosen, add a migration and delete references in `db/schema.ts` and `drizzle/schema.ts`.
- What breaks if unfixed: schema drift increases and future reviewers cannot tell which gates are real.

### 4) Reduce bout engine fan-out by extracting settlement and analytics helpers

- Current state: `lib/bout-engine.ts` combines validation, streaming, credit settlement, analytics, and error handling.
- Target state: split into `bout-validate`, `bout-execute`, and `bout-settle` modules with well-defined interfaces.
- Mechanism: request-response stays the same; internal structure changes only.
- Migration path: extract internal functions into new files and move unit tests with them; keep public API unchanged.
- What breaks if unfixed: change risk concentrates in a single file with high coupling.

---

## 4.3 Decision Log

1) This looks wrong, it is not wrong, here is why, revisit when X changes.
   - Mixed UI mechanisms: server actions for form submissions, fetch for API routes, SSE for streaming.
   - Why: server actions reduce client boilerplate for simple mutations, while streaming requires SSE and the AI SDK.
   - Revisit when: the app introduces a unified RPC layer or moves to a separate backend service.

2) This looks wrong, it is not wrong, here is why, revisit when X changes.
   - In-memory rate limiting and caching in `lib/rate-limit.ts` and `lib/leaderboard.ts`.
   - Why: Vercel single instance assumption and best effort throttling are acceptable at current scale.
   - Revisit when: deployment scales to multiple instances or abuse patterns require stronger guarantees.

3) This looks wrong, it is not wrong, here is why, revisit when X changes.
   - BYOK cookie stash before form submit.
   - Why: avoids exposing API keys in browser storage and limits key lifetime.
   - Revisit when: a secure client-side key vault or dedicated BYOK service is introduced.
