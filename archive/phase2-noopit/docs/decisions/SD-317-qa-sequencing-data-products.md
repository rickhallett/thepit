# SD-317: QA Sequencing & Three Data Products

**Date:** 2026-03-09
**Status:** STANDING (this run)
**Agent:** Weaver
**Backrefs:** SD-134 (truth-first), SD-266 (the-chain), SD-278 (pilot over), SD-309 (one-shot-on-hn)

## Context

Full code review complete on all polecat-written code (T-007 through T-025). 30 code-review checks executed by 3 parallel review agents (Claude). 28 pass, 2 fail, 12 Watchdog taxonomy hits. Polecat defect rate: ~19% (3/16 tasks with gate-invisible defects).

Two additional cross-model reviews (non-Claude) commissioned by Operator, in flight at time of decision.

Question: what is the optimal ordering of fix vs QA for maximum governance value?

## Decision

QA sequencing follows a split-by-independence strategy that produces three distinct data products:

```signal
SEQUENCE :=
  WAIT    cross_model_reviews.land
  SYNTH   triangulate(claude_review, review_2, review_3) -> durable_file
  FIX     batch(confirmed_issues) -> per_branch
  GATE    re_gate(all_branches) -> update_checklist
  WALK    operator.walkthrough(fixed_code) -> mark(human_checks)
  COMPARE human_findings vs model_findings -> governance_signal
```

### Data Product 1: Cross-Model Triangulation
Three independent reviews of the same code snapshot — Claude + two cross-model. Synthesized before any fixes, while the snapshot is stable. Measures: what each model caught, what each missed, where they converge, where they diverge. This is L11 (cross-model) validation data — the most valuable signal this run can produce about model-independent verification.

### Data Product 2: Fix Quality
All confirmed issues fixed in one batch after all reviews land. Clean diff between pre-fix and post-fix. No iterative patching that muddies the before/after comparison. Measures: how many of the model-identified issues were real, how many were false positives, what the fix cost was.

### Data Product 3: Human Delta
Operator's walkthrough happens on fixed code, so taste-time isn't wasted confirming issues 3 models already found. What the Operator catches that all 3 models missed is the irreducible human layer — the most interesting governance signal for the HCI study. Measures: the gap between automated+model verification and human judgment. This is the data that matters for the Anthropic red teaming case.

## Rationale

- Fix-first-then-QA wastes human time on known issues but gives clean walkthrough data
- QA-first-then-fix captures richer "before" data but wastes taste-time
- Split-by-independence maximizes all three data products without trade-offs
- The cross-model reviews are already commissioned — waiting costs nothing, synthesizing costs ~15 agent-minutes, and the triangulation data is permanently valuable
- The polecat defect rate (19%) validates the verification fabric thesis: probabilistic systems produce gate-invisible defects at predictable rates, and redundant verification catches what single-model review cannot

## Artifacts

- `docs/internal/weaver/code-review-2026-03-09.md` — Claude review findings (Data Product 1, first leg)
- `docs/internal/weaver/qa-master-checklist.yaml` — Master checklist (82 checks, programmatically queryable)
- `docs/internal/weaver/cross-model-triangulation.md` — Triangulation template (Data Product 1, synthesis)
- `bin/qa-progress` — Query tool for checklist status

## Implications

This decision establishes the QA cadence for the calibration run:
1. Model review (parallel, multi-model) produces findings
2. Triangulation produces convergence/divergence data
3. Fix batch addresses confirmed issues
4. Human walkthrough tests the irreducible layer
5. Post-walkthrough comparison produces the governance signal

The three data products are independently valuable:
- DP1 (triangulation) feeds the cross-model validation research
- DP2 (fix quality) feeds the polecat effectiveness measurement
- DP3 (human delta) feeds the HCI layer model (L12 irreducibility thesis)
