# Plan of Action: Test Suite Hardening

**Date:** 2026-02-28
**Author:** Weaver
**Status:** Planned — execution begins after AnotherPair copy tuning completes
**Back-ref:** SD-230, SD-231, SD-235, test-suite-audit-2026-02-28.md
**Captain's rulings:** Roadmap (not sprint). Budget for breakage. Engineering quality first. Eat our dogfood. Use the crew, evaluate their performance, cross-model review. Assertion criteria granularity deferred to post-compaction.

---

## Governing Principles (Captain's marks)

1. **Do it properly.** This is a roadmap, not a quick sweep.
2. **Budget for breakage.** The clearAllMocks→resetAllMocks migration will break tests that depend on leaked mock state. That breakage is signal — it reveals tests that were passing for the wrong reason.
3. **Engineering quality first.** If the hiring manager can't see the quality, they're not quality. Do not optimise for optics.
4. **Eat our dogfood.** Our own bout-engine tests first. If we can't verify our own output, we can't credibly audit the rest. Then systematic sweep.
5. **Use the crew.** Right agent for the job. Evaluate performance. Cross-model review on output. Train them to be better through the work.
6. **Assertion criteria granularity** — deferred to post-compaction session. The question of how defined the "status-code-only is acceptable when..." criteria need to be requires fresh context and Captain's attention.

---

## Phase 1: Mock Isolation (Janitor + Watchdog)

**Goal:** Close the mock implementation leak class entirely.

### 1a. clearAllMocks → resetAllMocks migration

- **Executor:** Janitor
- **Scope:** All 44 `vi.clearAllMocks()` instances across test files
- **Method:** Global replace. Run gate. Fix what breaks. Each break is a test that depended on leaked state — document in bugbot-findings.tsv with class `mock-leak`.
- **Budget:** 1-3 hours depending on breakage volume.
- **Reviewer:** Watchdog (verify fixes are correct, not just green). Cross-model review on the diff.
- **Risk:** Tests that intentionally share mock state across cases within a describe block. These exist but are an anti-pattern. If found, refactor to explicit per-test setup.

### 1b. Object.defineProperty try/finally

- **Executor:** Janitor
- **Scope:** 16 instances in `actions.test.ts` and `actions-happy.test.ts`. 2 remaining unwrapped in `bout-engine-validate.test.ts`.
- **Method:** Wrap every Object.defineProperty toggle in try/finally. Same pattern applied in bout-engine PRs.
- **Budget:** 30 minutes.
- **Reviewer:** Watchdog.

---

## Phase 2: Eat Our Dogfood (Watchdog)

**Goal:** Verify our own bout-engine tests first.

### 2a. Audit 25 status-code-only assertions in bout-engine-validate.test.ts

- **Executor:** Watchdog
- **Scope:** 25 instances of `toBe(4xx)` without error code/message verification.
- **Method:** For each assertion, trace the execution path. Determine: does this test verify the specific validation path it claims, or does it pass coincidentally? Classify as: (a) correct — status-only is sufficient for this test's intent, (b) Right Answer Wrong Work — needs error code assertion, (c) ambiguous — needs Captain's criteria ruling.
- **Output:** Classification table appended to bugbot-findings.tsv (new class: `assertion-audit`).
- **Reviewer:** Cross-model review. A different model evaluates Watchdog's classifications.

### 2b. Audit bout-engine-execute.test.ts and bout-engine-behavior.test.ts

- **Executor:** Watchdog
- **Same method as 2a.** These files have fewer status-code-only assertions but were also written by agents.

---

## Phase 3: Systematic Sweep (Watchdog + Janitor)

**Goal:** Audit the remaining 142 status-code-only assertions across the suite.

### 3a. API test files (33 files, ~100 assertions)

- **Executor:** Watchdog
- **Method:** Same classification as Phase 2. Batch by file. Top offenders first: `agents-create.test.ts` (17), `paper-submissions.test.ts` (10), `feature-requests.test.ts` (10).
- **Reviewer:** Cross-model review per batch.

### 3b. Bare .toHaveBeenCalled() audit (122 instances)

- **Executor:** Watchdog
- **Scope:** All 122 bare `.toHaveBeenCalled()` assertions.
- **Method:** For each, determine whether argument verification would add meaningful signal. Classify as: (a) acceptable — the call itself is the assertion (e.g., "function was not called"), (b) strengthen — should be `.toHaveBeenCalledWith(...)`.
- **Priority:** Lower than status-code audit. Mock call verification is weaker signal than status-code coincidence.

---

## Phase 4: Coverage Gate Expansion (Architect + Watchdog)

**Goal:** Bring the coverage gate from 11 files to 20+.

### 4a. High-risk untested files

- **Executor:** Watchdog writes tests. Architect reviews for domain correctness.
- **Files (priority order):**

| File | Lines | Risk | Reason |
|------|-------|------|--------|
| `lib/refusal-detection.ts` | 89 | High | Pure function, security-adjacent, trivially testable |
| `lib/anomaly.ts` | 198 | High | Security-adjacent, zero tests |
| `lib/copy-edge.ts` | — | Medium | Edge-case logic |
| `lib/api-schemas.ts` | — | Medium | Input validation schemas |
| `lib/engagement.ts` | — | Medium | User engagement logic |

### 4b. Add to coverage gate

- **Executor:** Architect (vitest.config.ts modification)
- **After tests exist:** Add each file to the `include` list with 85% threshold.
- **Incremental:** One file per PR. Gate must pass before the next file is added.

---

## Phase 5: Cross-Model Evaluation (Weaver)

**Goal:** Verify crew output with independent perspective.

- **Method:** After each phase completes, dispatch a cross-model review (different model or different prompt framing) to evaluate:
  - Did the executor miss anything?
  - Are the classifications correct?
  - Did any new Right Answer Wrong Work patterns get introduced by the fixes?
- **Output:** Findings appended to bugbot-findings.tsv.
- **This is the "multiplying independent perspectives" principle in practice.** Each phase gets: executor → gate → cross-model review → human spot-check.

---

## Execution Sequence

```
Phase 1a (Janitor) → gate → review
Phase 1b (Janitor) → gate → review
Phase 2a (Watchdog) → cross-model review → Captain spot-check
Phase 2b (Watchdog) → cross-model review
Phase 3a (Watchdog) → cross-model review (batched)
Phase 3b (Watchdog) → cross-model review (batched)
Phase 4a (Watchdog + Architect) → gate → review (per file)
Phase 4b (Architect) → gate
Phase 5 (Weaver) → continuous, after each phase
```

Phases 1a and 1b can run in parallel (different files). Phase 2 depends on Phase 1 completing (mock isolation must be clean before auditing assertions). Phase 3 depends on Phase 2 (criteria refined from dogfood results). Phase 4 can begin after Phase 1.

---

## Success Criteria

- Zero `clearAllMocks` remaining (all replaced with `resetAllMocks`)
- Zero unwrapped `Object.defineProperty` toggles
- All bout-engine test assertions classified and remediated
- All 167 status-code-only assertions classified (remediation per Captain's criteria ruling)
- Coverage gate expanded to 20+ files
- Cross-model review completed on each phase's output
- All findings logged in bugbot-findings.tsv

---

## Deferred (Post-Compaction)

- Assertion criteria granularity — how defined do "status-code-only is acceptable when..." rules need to be?
- Whether to create a vitest plugin or custom rule for automated Right Answer Wrong Work detection (holding deck: `multiplying-independent-perspectives`)
- E2E test reactivation timeline

---

*Engineering quality first. If the hiring manager can't see it, they're not quality.*
