# Evaluation Criteria

Pre-registered before first line of code. Locked from commit 0.

## Context

This is a calibration run — a practitioner rebuilding a product with internalised knowledge from a prior 23-day build (855 commits, 38 documented anti-patterns). The purpose is to establish the operator's performance baseline under compressed governance. This is NOT an A/B experiment. The confounds are structural and acknowledged.

## What counts as success

1. **Core product loop works.** A user can: sign up → pick a preset → watch agents argue in real-time SSE → react → vote → share → see leaderboard. All verified by e2e tests.
2. **Economy works.** Credits: starting balance on signup → preauthorisation → settlement → balance updated. Stripe: subscribe → webhook → tier change → credit grant. All verified by integration tests.
3. **Gate passes from commit 1 onward.** typecheck + lint + test:unit. No exceptions. No skips.
4. **Measurement exists from commit 0.** Every commit is timestamped. Human intervention tags (`[H:steer]`, `[H:correct]`, `[H:reset]`, `[H:obstacle]`, `[H:scope]`) are in commit messages. Post-hoc analysis is possible without reconstruction.
5. **~~AGENTS.md does not grow.~~** *(Amended 2026-03-05: the "4 lines" hypothesis was falsified by Day 2. AGENTS.md grew to ~400 lines because the governance framework must be in the context window — it cannot be internalised by the operator alone. This is the central calibration finding, not a failure. The original text is preserved as the pre-registered hypothesis; the amendment is the result.)*
6. **Deployed to Vercel.** Live URL, smoke test passes.
7. **Slopodar-v2 captures any new anti-patterns.** Even if zero are found, the empty file is a data point.

## What counts as failure

1. **Core product loop broken.** Any step in the user journey fails and cannot be fixed within the build window.
2. **Gate disabled or weakened.** Any `--no-verify`, `continue-on-error`, or test suite removal.
3. **~~Governance growth.~~** *(Amended 2026-03-05: governance grew extensively — agent files, session decisions, lexicon, YAML HUD, gauntlet pipeline, darkcat adversarial review, pitkeel. Reclassified from "failure" to "finding." The calibration question was whether governance could be compressed. The answer is: it compresses into the operator's taste and the context window's prime position, but it does not disappear. See criterion 5 amendment.)*
4. **Scope creep beyond SPEC.md.** Features built that are not in the spec (EAS, Ask The Pit, paper submissions, etc.).
5. **Measurement abandoned.** Commits stop being tagged. Slopodar-v2 not maintained. Notebooks not written on analysis day.

## What counts as ambiguous

1. **Partial product loop.** Core works but economy doesn't (or vice versa). This is a finding about complexity distribution.
2. **Anti-patterns recur despite internalisation.** If slopodar-v2 entries match the original 18, the governance framework was doing more work than the Captain thought. This is valuable data, not failure.
3. **Timeline exceeds 4 days.** Not failure — an honest timeline adjustment is better than a rushed product. But the reasons must be documented.
4. **Cross-model tests catch things same-model tests wouldn't have.** This validates the methodology but doesn't speak to the main calibration question.

## Confounds (acknowledged, not controlled)

1. **Experimenter learning.** The Captain has done this before. Every decision is informed by round 1. Speed improvement proves learning occurred, not that governance was the bottleneck.
2. **Model version.** Claude in March 2026 is not Claude in February 2026. Any performance difference could be model capability.
3. **Specification familiarity.** "Same app spec" built the second time is a rebuild, not a replication. Design decisions are pre-explored.
4. **Scope difference.** The MVP spec is a subset of the original. Direct LOC comparison is misleading.
5. **Hawthorne effect.** Measuring changes behaviour. The Captain will code differently knowing every commit is evaluated.

## Metrics (collected, compared where possible)

### Automated (git-derived, post-hoc extraction)

- Commits per day / per session
- Lines changed per commit (insertions, deletions, churn ratio)
- Commit type distribution (feat/fix/chore/test/docs)
- Rework ratio (commits modifying files changed in last 5 commits)
- Time between commits (flow vs blocked)
- Gate pass/fail ratio
- Test count growth curve
- First-working-feature timestamp

### Manual (commit message tags)

- `[H:steer]` — Captain redirected agent
- `[H:correct]` — Captain corrected factual error
- `[H:reject]` — Captain rejected output
- `[H:approve]` — Captain accepted plan/output
- `[H:reset]` — Context window reset
- `[H:obstacle]` — Significant blocker
- `[H:scope]` — Scope pressure (wanted to add something OOS)

### Cross-model (novel)

- Tests written by Model A, implementation by Model B
- Failure rate: how often does implementation fail cross-model tests?
- Blind spot detection: defects caught by cross-model tests that same-model tests missed

### Round 1 comparison (where fair)

| Metric | Round 1 source | Calibration source | Fair? |
|--------|---------------|-------------------|-------|
| Commits/day | git log (retrospective) | git log (live) | Yes |
| Churn ratio | git log (retrospective) | git log (live) | Yes |
| Rework ratio | git log (retrospective) | git log (live) | Yes |
| Governance-to-code ratio | git log (retrospective) | git log (live) | Yes |
| Test growth curve | Partial (tests appeared late) | Full (from T0) | Partially |
| Human interventions | Not collected | Collected | No comparison |
| Anti-pattern discovery rate | Retrospective | Live | Not directly comparable |

## The narrative frame

> "I built a governance framework for AI agents with 11 specialised roles and 38 documented failure modes. Then I rebuilt the same product with 4 lines of governance and cross-model adversarial testing. Here's what I learned about which part was the framework and which part was me."

> *(Amended 2026-03-05: The 4 lines became ~400 by Day 2. The framework grew back because it is load-bearing — not overhead. The calibration finding: governance is not the bottleneck; it is the product. The tighter weave produced the tightest integration discipline the operator has achieved. 100% of time on calibration was the correct allocation.)*

This is a calibration run. Not an experiment. The value is in the doing, not the comparison.
