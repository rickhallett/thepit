# Cross-Examination: Build Order vs Spec vs Eval

## Part 1: Findings Table

| # | Category | Severity | Finding | Evidence | Recommendation |
|---|----------|----------|---------|----------|----------------|
| 1 | A (coherence) | HIGH | Data model count mismatch (12 in spec vs 11 in plan) creates ambiguity about missing table(s). | SPEC.md: "Data Model (12 tables)"; PLAN.md unit 0b: "11 tables" | Reconcile the schema inventory in PLAN or SPEC so the count and table list match. |
| 2 | A (coherence) | MED | Tables `referrals` and `page_views` appear in the spec but have no explicit build unit or API/workflow usage in the plan. | SPEC.md tables: `referrals`, `page_views`; PLAN.md units 1–23 contain no mentions | Either add a plan unit that uses them or remove/mark them as non-MVP in SPEC to avoid building unused schema. |
| 3 | B (internal consistency) | MED | Anonymous tier says “Max agents 0” but the core flow allows anonymous bouts and presets (which have agents). This is inconsistent without a clarified exception. | SPEC.md Tier Configuration: "Max agents 0" for Anonymous; Core Workflow 1 allows anonymous run-bout; UI `/arena` is public | Clarify whether anonymous presets are exempt from the max agents rule or adjust the tier table. |
| 4 | B (internal consistency) | MED | Feature flags default false, but critical flows depend on them; degraded-mode behavior is not specified. | SPEC.md Feature flags default false; Credit flow + Subscription flow require CREDITS/SUBSCRIPTIONS | Specify expected behavior when flags are off (e.g., run-bout credits bypass) so tests can assert correct fallback. |
| 5 | A (coherence) | MED | Plan declares "first deployable state" after Phase 2 with credits disabled, but EVAL success criteria include economy and share/leaderboard; risks premature “done” framing. | PLAN.md Phase 2 note; EVAL.md success criteria 1–2 | Mark Phase 2 as “demo-ready” not “deployable” or explicitly gate deployability on Phase 3–4 success. |
| 6 | C (eval alignment) | MED | EVAL requires e2e coverage for the core loop, but plan defers the full user-journey test to unit 23, increasing late discovery risk. | EVAL.md success #1; PLAN.md unit 23 | Pull forward a minimal e2e test or add a mid-plan verification milestone for the core loop. |
| 7 | D (feasibility) | HIGH | Unit 4 SSE + LLM + persistence + streaming turn loop likely exceeds 60–80 minutes given integration surface. | PLAN.md estimate 60–80 for unit 4; SPEC.md run-bout requirements (SSE stream, LLM, persistence, share line, rate limits) | Re-estimate or explicitly reserve contingency time; treat unit 4 as a multi-commit unit with intermediate verification gates. |
| 8 | D (feasibility) | MED | Phase 5 parallelism assumes independent UI pages but they share data-fetch patterns and components; sequencing risk is understated. | PLAN.md "parallel" units 16–20; UI pages in SPEC.md share catalogs, cards, and queries | Define shared UI/data patterns first or adjust dependency ordering to avoid redundant rework. |
| 9 | E (structural risk) | HIGH | SSE failure modes (partial stream, disconnect/reconnect, duplicate turns) are not specified in spec or plan, but SSE is the core interaction. | SPEC.md run-bout SSE response; Core Workflow 1; PLAN.md unit 4 test only covers successful stream | Add explicit failure-mode handling requirements and tests for SSE disconnect/replay behavior. |
|10 | C (eval alignment) | LOW | EVAL requires “integration tests” for Stripe webhooks, but plan verification is “Test: 6 webhook events” without naming the test strategy. | EVAL.md success #2; PLAN.md unit 14 verifiable by | Specify whether this is an automated test suite or manual replay so the success criterion is verifiable. |

## Part 2: Risk-Ranked Pre-Mortem

The most likely failure path starts at Unit 4. SSE streaming, LLM calls, and transcript persistence are tightly coupled; a minor mismatch between how the stream is emitted and how the client parses it will surface only when the UI is wired up in Unit 5. The plan’s verification for Unit 4 focuses on “stream works and bout persisted,” which can pass while the client still fails under reconnection or partial-stream conditions.

That failure then cascades into Phase 3. Reactions and votes are layered onto the bout viewer, but if the SSE stream can’t reliably signal completion, the UI can’t safely enable voting or sharing. This introduces fragile client-side state that will be “fixed” by ad hoc logic rather than a protocol-level guarantee. The result is a partially working core loop that looks correct in happy-path manual testing but fails under real network conditions.

Meanwhile, the economy work in Phase 4 will reveal that credits-on changes are much more invasive than the plan implies. Preauth/settle logic touches the run-bout control flow, and the same edge cases from streaming now have to be correct for refund behavior. If the SSE lifecycle is not robust, credit settlement will be inconsistent, and reconciliation logic will have to absorb too many error cases. This tends to push the team into delaying credits correctness or relaxing the tests to move forward.

Finally, the plan’s assumption of late e2e testing means that the first automated end-to-end validation will happen after multiple UI and API layers have accrued assumptions. The likely outcome is a late-stage “partial product loop” result: the live demo appears to work in a controlled flow, but the automated e2e test fails in a way that demands rework across multiple earlier units.

## Part 3: Questions the Documents Cannot Answer

1. What exact SSE event format will the client parse (fields, event names, ordering), and how is it validated?
2. How does the client handle reconnects or dropped connections mid-bout, and what server behavior is expected?
3. What is the idempotency key for `POST /api/run-bout`, and how does it behave on retries?
4. How are presets defined today (static list, DB, or code), and do they map 1:1 to `agent_lineup`?
5. What credit cost model is used for preauth vs settle (tokens, time, model tier), and where is it specified?
6. How are rate limits enforced (in-memory, DB, or external service), and what is the failure mode?
7. What is the exact SHA-256 input for `prompt_hash` (normalization, ordering, separators)?
8. What are the minimal test fixtures for Clerk + Stripe to enable deterministic integration tests locally?
9. How are leaderboard aggregations computed (materialized, live query, or cached)?
10. Which UI components are shared across `/arena`, `/agents`, `/recent`, and `/leaderboard`, and where will they live?
