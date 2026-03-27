# SD-329: Transactional Integrity Standardisation

**Date:** 2026-03-17
**Status:** ACTIVE
**Author:** Architect (via Weaver)
**Provenance:** Recurring finding across RD-001, RD-003, RD-012, RD-017, RD-020 adversarial reviews + retrospective sweep (retro-claude.log, retro-codex.log)

---

## Decision

Standardise `DbOrTx` as the composable transaction pattern across the codebase. Extract the type from `lib/credits.ts` to `db/index.ts`. Wrap 8 identified non-atomic multi-step DB operations in `db.transaction()`, passing `tx` through the call chain.

## Context

The retrospective sweep across all 25 roadmap items revealed a recurring pattern: multi-step database operations that should be atomic but are not. Three independent models (Claude, Codex, Gemini) flagged this across separate review rounds. The pattern appeared in RD-001, RD-003, RD-012, RD-017, and RD-020 - it was the single most frequently surfaced finding across the entire roadmap.

The codebase already has a proven solution. `lib/credits.ts` defines `DbOrTx` (line 173) - a type that allows functions to accept either a full database handle or a transaction handle. Functions that accept `DbOrTx` can be composed inside a caller's transaction boundary or run independently with their own transaction. This pattern was proven in RD-001 (intro pool atomicity) and works correctly.

The problem is that `DbOrTx` is local to `credits.ts` and only 5 of 16 multi-step operations use it. The remaining 11 operate without transaction boundaries.

## The DbOrTx Pattern

```typescript
// Extracted to db/index.ts
export type DbOrTx = Pick<ReturnType<typeof requireDb>, 'select' | 'insert' | 'update' | 'delete'>;

// Usage in domain functions
export async function someOperation(userId: string, tx?: DbOrTx) {
  const conn = tx ?? requireDb();
  // Use conn for all queries - runs in caller's tx or standalone
}

// Composition - caller owns the transaction boundary
await db.transaction(async (tx) => {
  await operationA(userId, tx);
  await operationB(userId, tx);
  // Both succeed or both roll back
});
```

The `delete` method is added to the Pick (not present in the original credits.ts definition) because `toggleReaction` and `toggleFeatureRequestVote` require DELETE operations within their transaction boundaries.

## Inventory

### Group A: Already Transactional (5 operations)

These are correct. No changes needed.

| ID | File | Function | Notes |
|----|------|----------|-------|
| A1 | `lib/credits.ts` | `applyCreditDelta` | Reference pattern. Uses DbOrTx. |
| A2 | `lib/credits.ts` | `preauthorizeCredits` | Atomic check-and-deduct. |
| A3 | `lib/credits.ts` | `settleCredits` | Charge path transactional. Refund delegates to A1. |
| A4 | `lib/intro-pool.ts` | `claimIntroCredits` | Uses DbOrTx. Passes tx to A1. |
| A5 | `lib/seed-agents.ts` | `seedAllAgents` | DB writes atomic. External API calls correctly separated. |

### Group B: Should Be Transactional (11 operations, 8 actionable)

Priority ordering reflects financial risk and exploitability.

| ID | File | Function | Risk | Action |
|----|------|----------|------|--------|
| B1 | `lib/referrals.ts` | `applyReferralBonus` | HIGH | Wrap insert+claim+update in tx. Pass tx to claimIntroCredits. |
| B2 | `lib/billing.ts` | `handleSubscriptionUpdated` | MEDIUM | Wrap tier read+update+grant in tx. TOCTOU on concurrent webhooks. |
| B8 | `lib/remix-events.ts` | `recordRemixEvent` | MEDIUM | Wrap event insert + both credit grants in tx. |
| B3 | `lib/billing.ts` | `handleSubscriptionCreated` | LOW-MED | Wrap tier update + credit grant in tx. |
| B4 | `lib/billing.ts` | `handleInvoicePaymentSucceeded` | LOW-MED | Wrap tier update + monthly grant in tx. |
| B7 | `lib/billing.ts` | `handleCheckoutCompleted` | LOW-MED | Wrap idempotency check + credit grant in tx. |
| B11 | `lib/onboarding.ts` | `applySignupBonus` | LOW-MED | Wrap idempotency check + claim in tx. |
| B9 | `lib/reactions.ts` | `toggleReaction` | LOW | Wrap for correctness. Non-financial. |
| B10 | `lib/feature-requests.ts` | `toggleFeatureRequestVote` | LOW | Wrap for correctness. Non-financial. |
| B5 | `lib/billing.ts` | `handleSubscriptionDeleted` | LOW | Analytics-only impact. Defer. |
| B6 | `lib/billing.ts` | `handleInvoicePaymentFailed` | LOW | Analytics-only impact. Defer. |

**Scope for this PR:** B1, B2, B3, B4, B7, B8, B9, B10, B11 (9 operations).
**Deferred:** B5, B6 (analytics-only impact, marginal value does not justify the change).

### Group C: Acceptable Without Transaction (14 operations)

Single-operation functions, idempotent upserts, or operations that span external API calls (Stripe, Clerk) where a DB transaction cannot and should not wrap the external call. No changes needed. See inventory in exploration notes.

## Schema-Level Defence: referenceId UNIQUE Constraint

Multiple review rounds flagged that `credit_transactions.referenceId` is used as an idempotency key (e.g., `hasExistingGrant` in billing.ts) but lacks a UNIQUE constraint. Application-level checks work but are not structurally enforced.

**Decision:** Evaluate but do not implement in this PR. The referenceId column is used with different semantics across different transaction sources (some use boutId, some use a composite string, some allow duplicates by design for ledger entries). A blanket UNIQUE constraint would break existing patterns. A conditional unique index (e.g., `WHERE source IN ('subscription_grant', 'checkout_grant')`) is the right approach but requires careful analysis of all referenceId usage patterns. This is a follow-up item.

## Implementation Plan

1. Extract `DbOrTx` type to `db/index.ts` with `delete` added
2. Update `lib/credits.ts` to import `DbOrTx` from `db/index.ts` (remove local definition)
3. Update `lib/intro-pool.ts` to import `DbOrTx` from `db/index.ts`
4. Add `tx?: DbOrTx` parameter to functions that need to participate in caller transactions:
   - `updateUserSubscription` in `lib/billing.ts`
   - `hasExistingGrant` in `lib/billing.ts`
5. Wrap each B-group operation in `db.transaction()`, passing `tx` through the call chain
6. Add tests for each wrapped operation verifying atomicity (mock DB failure after first write, verify rollback)

## Test Strategy

Each wrapped operation gets at minimum:
- A test verifying the happy path still works
- A test verifying that when a later step throws, earlier steps are rolled back (mock the DB to throw on a specific call)

For operations that compose `applyCreditDelta`, the existing credit tests provide coverage of the inner transaction. New tests focus on the outer composition boundary.

## Risk Assessment

- **Implementation risk:** Low. The pattern is proven. Each change is a mechanical wrap.
- **Regression risk:** Low. No external behaviour changes. Tests verify atomicity.
- **Performance risk:** Negligible. Interactive transactions add one round trip for BEGIN/COMMIT. Neon WebSocket pool already supports this efficiently.
- **Blast radius:** Moderate. Changes touch billing, referrals, remix events, onboarding, reactions, and feature requests. Each is an independent function - a bug in one does not propagate to others.

## Provenance

- Original DbOrTx pattern: RD-001 (PR#75, 2026-03-16)
- Retrospective sweep: `data/sweep/retro-claude.log`, `data/sweep/retro-codex.log`
- Convergence: Both Claude and Codex independently flagged non-atomic operations as their highest-priority finding
- Inventory method: Full codebase scan of all `db.` usage, all multi-step write sequences, all functions that compose other DB functions
