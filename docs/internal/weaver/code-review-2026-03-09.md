# Code Review Findings — 2026-03-09

**Reviewer:** Weaver (3 parallel review agents, independent of author polecats)
**Scope:** All polecat-written code across phase2-ui, phase4-economy, phase5-discovery
**Method:** git show from main branch, stained against Watchdog taxonomy + slopodar
**Checklist:** 30 code-review checks (P23-CR01..12, P4-CR01..12, P5-CR01..06)

## Verdicts: 28 PASS, 2 FAIL

### Failures

| ID | Description | Severity | Fix effort |
|----|-------------|----------|------------|
| **P4-CR01** | `applyCreditDelta` not atomic — UPDATE balance + INSERT transaction are two separate queries without `db.transaction()`. reference_id has NO UNIQUE constraint. | **High** | Wrap in transaction, add UNIQUE index on reference_id |
| **P4-CR06** | `req.signal` never propagated to LLM calls. Client disconnect triggers credit refund (correct) but LLM calls continue burning API tokens. | **Medium** | Documented known limitation. Fix requires AbortSignal plumbing through AI SDK |

### Watchdog Taxonomy Hits (12 total)

| # | Pattern | Location | Description |
|---|---------|----------|-------------|
| 1 | **Phantom Ledger** | balance.ts | UPDATE balance and INSERT transaction are separate queries. INSERT failure = balance changed without audit trail |
| 2 | **Paper Guardrail** | webhook.ts, balance.ts | "Idempotent via reference_id" stated but reference_id column has no UNIQUE constraint. Application-level SELECT check only |
| 3 | **Paper Guardrail** | credit_transactions schema | reference_id: varchar(256) — no `.unique()`, no `.notNull()`. Duplicate reference_ids allowed at DB level |
| 4 | **Semantic Hallucination** | balance.ts docstring | "Also logs the transaction" implies atomic; it's two separate queries |
| 5 | **Semantic Hallucination** | validation.ts docstring | "exploit patterns" overstates the special-char heuristic |
| 6 | **Semantic Hallucination** | create.ts docstring | "nanoid-style" but uses UUID-derived ID with different alphabet/entropy |
| 7 | **Looks Right Trap** | reactions.ts toggleReaction | select-then-insert without onConflictDoNothing. UNIQUE constraint catches dupes but throws rather than handling gracefully. cf votes.ts which does it right — inconsistent patterns, same codebase |
| 8 | **Looks Right Trap** | intro-pool.ts:113-119 | Post-UPDATE back-calculation of "actual claim" makes fragile assumptions about pre-update state |
| 9 | **Looks Right Trap** | agent-builder.tsx | `responseLength` and `responseFormat` dropdowns render in UI but are NEVER submitted. User sees functional controls that do nothing |
| 10 | **Completeness Bias** | intro-pool.test.ts | Only credit module with mocked-only tests (all others have real DB integration tests) |
| 11 | **Completeness Bias** | types.ts AgentCreateInput | systemPrompt has NO max length constraint while every other string field does |
| 12 | **Completeness Bias** | validation.ts | topic allows empty string "" — .max(500) enforced but .min(1) missing |

### Additional Findings (not in checklist)

| # | Finding | Phase | Severity |
|---|---------|-------|----------|
| 1 | **run-bout has NO rate limiting** on phase2-ui. Most expensive endpoint (LLM calls). Mitigated by credits on phase4 but unprotected on the base branch | P2 | Medium |
| 2 | **Leaderboard loads all votes into memory** then aggregates in JS. OOM risk at scale. Should be SQL aggregation | P2 | Low |
| 3 | **No tie-breaking** for bouts where agents have equal votes. First-iterated agent wins | P2 | Low |
| 4 | **No DB transactions anywhere** in credit code. Every UPDATE+INSERT pair is non-atomic | P4 | High |
| 5 | **In-memory rate limiters reset on cold start**. Per-instance, not global. Documented but not enforced durably | P4/P5 | Low |
| 6 | **getAgentDetail returns archived agents** (no archived filter). getAgentSnapshots correctly excludes them. Inconsistent | P5 | Low |
| 7 | **BoutHero shareLine fallback** renders quote without speaker attribution badge | P5 | Low |
| 8 | **No OG image** on replay pages. Text-only social previews | P5 | Low |
| 9 | **computePromptHash excludes name** when systemPrompt is set. Two agents with different names but same prompt get same hash | P5 | Low |
| 10 | **Empty string systemPrompt untested**. Falls to structured path silently | P5 | Low |

## Systemic Patterns

### The Transaction Gap (P4 — most critical)
The entire credit subsystem lacks `db.transaction()` wrapping. Every operation that does UPDATE + INSERT uses two separate queries. This means:
- Balance can change without audit trail (INSERT fails after UPDATE)
- Idempotency relies on application-level SELECT (bypassable under concurrency)
- The preauth is the EXCEPTION — it's genuinely atomic (single UPDATE with WHERE guard)

**Fix:** Wrap `applyCreditDelta` internals in `db.transaction(async (tx) => { ... })`. This propagates to all callers (settlement, webhook handlers, intro pool). Add UNIQUE constraint on `credit_transactions.reference_id`.

### The Consistency Gap (P2+3)
Two patterns for handling duplicate operations exist in the same codebase:
- **votes.ts**: `onConflictDoNothing` — correct, graceful
- **reactions.ts**: select-then-insert — race-vulnerable, throws on conflict
Both were written by different polecats with no cross-reference.

### Polecat Error Distribution
- 15 tasks dispatched to polecats
- 2 hard failures found (P4-CR01 transaction gap, P4-CR06 AbortSignal)
- ~8 soft findings (gaps that work at happy-path but fail under edge conditions)
- T-018 (manually fixed earlier) was a 3rd failure — polecat-rate: ~3/16 = 19% defect rate
- All defects are in the "Looks Right Trap" / "Paper Guardrail" class — syntactically valid, gate-passing, semantically incomplete

## Recommendation for Operator's Walkthrough

The 2 failures are:
1. **P4-CR01**: Fix before production. The transaction gap is a data integrity risk.
2. **P4-CR06**: Accept as known limitation. Document the cost leak.

The human walkthrough should focus on:
- **P23-T01/T03**: Does the core product loop actually feel right?
- **P4-T01**: Do the credit numbers make sense to a human?
- **P23-S01**: Can you actually inject a prompt?
- **P5-H05**: Does the replay page render correctly?

These are the checks where human judgment adds the most signal.
