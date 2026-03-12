# Weaver Code Review — Integration Discipline Report

> **Mission:** Every change that enters the system must be verified before it is trusted. 
> **Branches Evaluated:** `phase2-ui`, `phase4-economy`, `phase5-discovery`, `phase6-ship`
> **Base Commit:** `9d7e00d` (main)

## 1. Governance & Staining Assessment

Across the phases evaluated, the core mechanical functionality (routing, SSE streams, UI components) works and tests are passing. However, applying the Watchdog staining checklist reveals critical architectural and transactional flaws that violate integration discipline.

### Phase 4 (Economy): The Ledger Violations

The most severe violations exist in the credits system, specifically relating to transactional integrity and idempotency.

*   **SLOP: Phantom Ledger (`lib/credits/balance.ts` & `preauth.ts`)**
    *   **Finding:** `applyCreditDelta` and `preauthorizeCredits` execute a database `UPDATE` on the `credits` table followed sequentially by an `INSERT` into `credit_transactions`. These are *not* wrapped in a database transaction (`db.transaction()`).
    *   **Risk:** If the application crashes between the operations, or if the `INSERT` fails, the user's balance is modified permanently without a corresponding transaction log. The ledger is broken.
    *   **Mandate:** All financial modifications MUST be wrapped in atomic transactions.

*   **SLOP: Paper Guardrail / Idempotency Failure (`lib/stripe/webhook.ts`)**
    *   **Finding:** Webhook handlers claim to be "idempotent via reference_id check". They implement a read-before-write check (`hasProcessedReference`). However, `referenceId` on `creditTransactions` in `db/schema.ts` lacks a `UNIQUE` constraint. 
    *   **Risk:** If Stripe delivers duplicate webhook events concurrently, both requests will read `false` for the existence check, and both will grant credits to the user.
    *   **Mandate:** Enforce idempotency at the database level. Add a `UNIQUE` constraint to `credit_transactions.reference_id` and handle the resulting `ON CONFLICT` constraints.

### Phase 2 & 6 (UI, Engagement, Ship): The Scaling Flaws

*   **SLOP: Loom Speed / Scale Blindness (`lib/engagement/leaderboard.ts`)**
    *   **Finding:** The `getLeaderboardData` function executes a `SELECT` that pulls *all individual votes* from all completed bouts into Node.js memory, then loops over them to group by bout, calculate winners, and sum agent wins. 
    *   **Risk:** As the platform scales, this approach will pull hundreds of thousands of rows into the application layer on every leaderboard render, resulting in OOM (Out of Memory) crashes and extreme latency. 
    *   **Mandate:** Push aggregations down to the database. Use `GROUP BY` and window functions (e.g., `RANK() OVER`) or a materialized view to calculate the leaderboard.

*   **Observation: Race-Prone Upserts (`lib/engagement/reactions.ts`)**
    *   **Finding:** `toggleReaction` uses a `SELECT` -> `DELETE`/`INSERT` pattern. While the database schema correctly has a unique constraint to prevent duplicates, the manual check pattern is race-prone and requires two database round trips. 
    *   **Mandate:** Refactor to use `INSERT ... ON CONFLICT DO NOTHING` for atomic operations where applicable.

### Phase 5 (Discovery): Brittle Hashing

*   **Observation: Non-Deterministic Hashing (`lib/agents/create.ts`)**
    *   **Finding:** `computePromptHash` uses `JSON.stringify()` on a JavaScript object to create a hash. While V8 preserves insertion order for non-numeric keys, relying on standard `JSON.stringify` for cryptographic hashes is brittle and fails if the runtime changes or object construction is altered.
    *   **Mandate:** Use a deterministic JSON stringifier (e.g., `fast-json-stable-stringify`) to guarantee consistent hashes regardless of object key order.

## 2. Decision & Next Steps

**STATUS:** `REJECTED FOR MERGE (HOLD)`

The branches contain critical logic that will result in financial data corruption and catastrophic memory scaling issues. 

**Required Actions Before Merge:**
1. **Economy:** Refactor `applyCreditDelta` and `preauthorizeCredits` to use `db.transaction()`.
2. **Economy:** Add a unique index to `credit_transactions.reference_id` in `db/schema.ts` and update webhooks to rely on database constraints for idempotency.
3. **Engagement:** Rewrite `getLeaderboardData` to perform vote counting and winner resolution via SQL queries instead of in-memory maps.
4. **Agents:** Implement deterministic JSON stringification for agent prompt hashes.

*This report constitutes Weaver S4 review protocol. Fix the findings on their respective branches before proceeding to S5 merge.*
