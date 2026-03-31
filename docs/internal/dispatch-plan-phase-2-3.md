# Autonomous Dispatch Plan: Phase 2 + Phase 3

Created: 2026-03-30
Status: Active
Target: MVP sentence satisfied end-to-end

## MVP Sentence

> Run a structured task between two or more agent configurations,
> evaluate outputs, store traces, show scores, show failure tags,
> and show cost.

## Dependency Graph

```
M2.1 [DONE, PR #112]
  |
  v
M2.2 (evaluator engine) ---- CRITICAL PATH BOTTLENECK
  |         |         |
  v         v         v
M2.3      M2.4      M3.1     <-- Wave 2: three parallel agents
(scores)  (tags)    (costs)
  |         |         |
  |    +----+         |
  v    v              v
M2.5       M3.2    M3.3      <-- Wave 3: three parallel agents
(report)   (econ)  (UI:form)
  |         |         |
  +----+----+----+----+
       v
     M3.4                    <-- Wave 4: UI report page
       |
       v
     M3.5                    <-- Wave 5: UI list + E2E
```

## Execution Waves

### Pre-wave: Merge M2.1

Merge PR #112 to main. 5 agent-minutes.

### Wave 1: M2.2 (solo, blocks everything)

| Field | Value |
|---|---|
| Base | main (after M2.1 merge) |
| Branch | feat/XXX-m2.2-evaluator-engine |
| Est. | 45-60 agent-min |

Deliverables:
- Migration: evaluations table
- EvaluationId branded type
- lib/eval/evaluations.ts (persistence)
- lib/eval/scoring.ts (computeWeightedScore, 0..1 normalization)
- lib/eval/judge.ts (evaluateContestant, evaluateRun, buildJudgePrompt, reconciliation)
- app/api/runs/[id]/evaluate/route.ts (POST)
- app/api/rubrics/route.ts (POST + GET)
- app/api/rubrics/[id]/route.ts (GET)
- Zod: judgeOutputSchema, evaluateRunSchema
- ~18 unit tests + API tests

Key complexity: judge output reconciliation (name matching, missing/extra criteria, score clamping).

### Wave 2: M2.3 + M2.4 + M3.1 (three parallel agents)

All base off main after M2.2 merge.

**Agent-2A: M2.3 (scorecard/comparison), 25-35 min**
- lib/eval/scoring.ts: Scorecard, RunComparison types, buildScorecard(), compareRun()
- app/api/runs/[id]/scores/route.ts (GET)
- app/api/comparisons/route.ts (GET)
- ~9 tests, no migrations

**Agent-2B: M2.4 (failure tagging), 30-40 min**
- Migration: failure_category enum + failure_tags table
- FailureTagId branded type
- lib/eval/failure-tags.ts (CRUD + distribution query)
- Extend judgeOutputSchema with optional failureTags
- Patch evaluateContestant() to persist judge-assigned tags
- app/api/runs/[id]/failures/route.ts (GET + POST)
- ~7 tests

**Agent-2C: M3.1 (cost ledger), 30-40 min**
- Migration: cost_source_type enum + cost_ledger table
- lib/run/pricing.ts (MODEL_PRICING constant, computeCostMicro)
- Patch lib/run/engine.ts (cost entry after trace insert)
- Patch lib/eval/judge.ts (cost entry after evaluation insert)
- ~6 tests

**Conflict risk:** M2.4 and M3.1 both patch lib/eval/judge.ts. Merge M2.3 first (clean), then whichever of M2.4/M3.1 finishes first, then rebase the other (trivial adjacent-line conflict).

### Wave 3: M2.5 + M3.2 + M3.3 (three parallel agents)

**Agent-3A: M2.5 (run report), 30-40 min**
- Base: main after all Wave 2 merged
- RunReport type, lib/eval/report.ts (assembleRunReport, generateSummary)
- app/api/runs/[id]/report/route.ts (GET, pure read, never writes)
- Summary generation writes cost_ledger entry (sourceType: summary)
- ~7 tests, no migrations

**Agent-3B: M3.2 (economics), 20-30 min**
- Base: main after M2.3 + M3.1 merged (does not need M2.4)
- lib/run/economics.ts (RunEconomics, getRunEconomics)
- app/api/runs/[id]/economics/route.ts (GET)
- scorePerDollar = overallScore / (costMicro / 1_000_000)
- ~7 tests, no migrations

**Agent-3C: M3.3 (UI: run creation), 35-45 min**
- Base: main after M3.1 merged (needs pricing table only)
- app/(eval)/layout.tsx (route group with sidebar)
- app/(eval)/runs/new/page.tsx
- components/eval/RunForm.tsx, ModelSelector.tsx
- Install shadcn/ui components (Input, Select, Card, Table)
- No backend changes

### Wave 4: M3.4 (UI: run report), 40-50 min

- Base: main after M2.5 + M3.2 + M3.3 merged
- app/(eval)/runs/[id]/page.tsx
- 6 components: ScoreCard, FailureTagBadge, CostBreakdown, ComparisonView, TraceViewer, EvaluateButton
- Server components call lib functions directly, no API round-trip

### Wave 5: M3.5 (UI: run list + E2E), 25-35 min

- Base: main after M3.4 merged
- app/(eval)/runs/page.tsx
- components/eval/RunList.tsx, StatusBadge.tsx
- tests/e2e/eval-run.spec.ts (Playwright)

## Timing

| Wave | Wall-clock | Cumulative | Agents |
|---|---|---|---|
| Pre | 5 min | 5 min | 0 |
| 1 | 55 min | 60 min | 1 |
| 2 | 40 min | 100 min | 3 |
| 3 | 40 min | 140 min | 3 |
| 4 | 45 min | 185 min | 1 |
| 5 | 30 min | 215 min | 1 |

**Wall-clock: ~215 agent-minutes (~3.5 agent-hours)**
**Compute: ~340 agent-minutes (~5.7 agent-hours)**

## Risks

1. **M2.2 bottleneck** -- Everything blocks on M2.2. Mitigate by front-loading scoring.ts (pure function) and evaluations.ts (persistence) before judge.ts (complex reconciliation).

2. **judge.ts merge conflict** -- M2.4 and M3.1 both patch evaluateContestant(). Merge order: M2.3 first (clean), then M2.4 or M3.1 (first-finished wins), then rebase the other.

3. **generateObject() variance** -- AI SDK structured output may behave differently across models. Spec calls for generateText() + JSON.parse() fallback. Mock AI SDK in tests.

4. **E2E needs running app** -- M3.5 Playwright test needs dev server + database. Follow existing e2e patterns.

## Post-Completion

1. Run full gate on main: pnpm run test:ci
2. Run E2E: pnpm run test:e2e
3. Verify Phase 2 gate checklist (11 items)
4. Verify Phase 3 gate checklist (14 items, = MVP gate)
5. Write phase retros
6. Update dev-cost-ledger.yaml
7. Clean up worktrees
