# Change Propagation Analysis - Phase 3: Pattern Analysis

**Date:** 2026-03-16
**Codebase:** The Pit (thepit-v2)
**Methodology:** `docs/internal/audits/change-propagation-methodology.md`

---

## 3.1 Mechanism Consistency

### Boundary Aggregation

| Boundary | Dominant Mechanism | Consistency Assessment |
|----------|--------------------|------------------------|
| `app/` -> `lib/` | Request-response (Function calls) | **Consistent.** Server actions and API routes cleanly call domain functions. |
| `app/` -> `db/` | Direct mutation (Drizzle queries) | **Mixed without clear rationale.** `app/actions.ts` directly inserts into the `bouts` table, whereas `app/api/run-bout/route.ts` correctly delegates to `lib/bout-engine.ts`. The Stripe webhook (`app/api/credits/webhook/route.ts`) also contains raw SQL lookups instead of delegating to a `lib/users.ts` repository method. |
| `lib/` -> `db/` | Direct mutation (Drizzle queries) | **Consistent.** The domain layer natively interacts with the database. |
| `lib/` -> External | Request-response (LLMs), Event propagation (PostHog) | **Consistent.** Clear separation of sync API calls vs async fire-and-forget telemetry. |

**System's Dominant Propagation Pattern:** Primarily request-response paired with direct database mutation. However, there is a lack of strict encapsulation between the routing/transport layer (`app/`) and the data access layer (`db/`).

---

## 3.2 Smell Catalogue

| Smell | Description | Specific Findings (File references) | Severity |
|-------|-------------|-------------------------------------|----------|
| **Cross-boundary direct mutation** | One module directly mutates another's state without a defined interface | `app/actions.ts:createBout` directly mutates the `bouts` table using `db.insert(bouts)`. It bypasses the `lib/` domain layer entirely for creation. | High |
| **Inconsistent mechanism at same boundary** | Same boundary uses events in one place and function calls in another | `app/` mutates `db/` directly in some places (`actions.ts`) but delegates to `lib/` in others (`run-bout/route.ts`). | Medium |
| **Missing failure handling on change hops** | Change crosses a boundary with no handling for receiver failure | `lib/onboarding.ts:applySignupBonus`. If `lib/credits.ts:applyCreditDelta` throws an error after `lib/intro-pool.ts:claimIntroCredits` succeeds, the system permanently leaks credits from the intro pool without granting them to the user. | High |
| **Implicit ordering dependencies** | Code assumes change A visible before change B with no guarantee | None identified. Operations are correctly sequential or wrapped in `Promise.all` for concurrency. | N/A |
| **Manual sync of derived state** | Value manually updated in N places | None identified. | N/A |
| **Event chains with no circuit breaker** | Event triggers another with no depth limit | None identified. System uses synchronous functional composition, not deep event buses. | N/A |
| **Polling where subscription would serve** | Periodic check for changes | None identified. SSE is correctly implemented in `run-bout`. | N/A |
| **State duplication without sync strategy** | Same data in 2+ locations with no consistency mechanism | `lib/leaderboard.ts` and `lib/onboarding.ts` use module-level in-memory caches. In horizontal environments (like Vercel), different instances will serve different stale data. | High |
| **God module** | Disproportionate fan-out, mixing concerns | `app/actions.ts` coordinates across 10+ distinct domains. The Stripe webhook (`app/api/credits/webhook/route.ts`) mixes routing, signature validation, domain business rules (tier resolution), and raw DB queries. | Medium-High |
| **Dead state** | Unused tables/stores | None identified. | Low |

---

## 3.3 Change Impact Projection

### Scenario 1: Refactor database schema to abstract "Bouts" (e.g., adding multi-stage tournaments)
- **Change paths:** Database schema, UI creation forms, engine execution.
- **Boundaries crossed:** `db/` -> `lib/`, `db/` -> `app/`.
- **Difficulty:** **Structurally Difficult.**
- **Friction Description:** Because `app/actions.ts` directly implements the SQL `INSERT` for bouts, changing the data shape requires rewriting Next.js Server Actions. The lack of a unified `lib/bouts.ts` service means schema changes bleed directly into the UI layer.

### Scenario 2: Add an "Enterprise" billing tier with custom rate limits and manual invoicing
- **Change paths:** `lib/tier.ts`, `lib/credits.ts`, `app/api/credits/webhook/route.ts`.
- **Boundaries crossed:** `lib/` -> `app/`.
- **Difficulty:** **Awkward.**
- **Friction Description:** Tier resolution logic and monthly grant rules are hardcoded directly inside the Stripe Webhook route handler (`app/api/credits/webhook/route.ts`) rather than encapsulated in a `BillingService`. A new tier requires modifying the HTTP transport layer.

### Scenario 3: Deploy to a distributed Multi-Region Serverless Edge (e.g., global Vercel Edge)
- **Change paths:** `lib/leaderboard.ts`, `lib/onboarding.ts`, `lib/copy.ts`.
- **Boundaries crossed:** In-memory -> Distributed Cache (Redis).
- **Difficulty:** **Structurally Difficult.**
- **Friction Description:** The system heavily relies on module-scoped `let leaderboardCache` and `let copyCache`. These variables will not synchronize across regions or Vercel isolates, leading to severe data fragmentation. A true distributed caching layer (e.g., Upstash Redis) must replace all local variables.

(End of Phase 3)
