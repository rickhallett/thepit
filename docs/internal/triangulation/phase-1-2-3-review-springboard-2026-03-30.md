# Adversarial Review Springboard: Phase 1 + 2 + 3

Date: 2026-03-30
Scope: Commits ae5f854..a4e5a3e (11 squash merges)
Lines added: ~9,050 across 74 files
Tests added: ~146 (1,542 -> 1,688)
Agents involved: 10 (1 human-driven, 9 autonomous subagents in isolated worktrees)
Session duration: single session, ~215 agent-minutes wall-clock

## Taxonomy of Review Labels

Use these labels to tag findings. Each has a severity and a category.

### Severity

- **S1-critical**: Breaks correctness, data integrity, or security. Must fix before production.
- **S2-major**: Incorrect behavior under non-edge conditions. Likely to surface in normal use.
- **S3-minor**: Code quality, convention violation, or edge case. Unlikely to cause incidents.
- **S4-nit**: Style, naming, documentation. No functional impact.

### Category

- **DATA**: Schema design, migration correctness, FK integrity, type safety at persistence boundary
- **LOGIC**: Business logic correctness, state machine violations, off-by-one, normalization math
- **SECURITY**: Auth bypass, injection, missing validation at trust boundary, rate limiting gaps
- **API**: HTTP contract (status codes, response shapes, error handling, idempotency)
- **INTEGRATION**: Cross-module coupling, import cycles, mock fidelity vs real behavior
- **CONCURRENCY**: Race conditions, duplicate writes, stale reads
- **COST**: Financial computation correctness (microdollar arithmetic, rounding, pricing)
- **AI**: LLM call patterns, prompt construction, structured output parsing, reconciliation
- **UI**: Component correctness, missing states (loading/error/empty), accessibility
- **PROCESS**: Commit hygiene, PR scope, test coverage gaps, spec divergence

## Commit Map

Each commit below is a squash merge. The PR number links to GitHub for the full diff.

### Phase 1: Run Model

**#110** `6cc922d` -- Phase 1 combined (M1.1-M1.5)
Originally 6 commits squashed. Contains all run model foundations.

| Layer | Files |
|---|---|
| Schema | `db/schema.ts` (+141), `drizzle/0004` through `0007` |
| Domain IDs | `lib/domain-ids.ts` (+34): TaskId, RunId, ContestantId, TraceId |
| Domain logic | `lib/run/tasks.ts`, `runs.ts`, `contestants.ts`, `engine.ts`, `queries.ts`, `types.ts`, `index.ts` |
| API schemas | `lib/api-schemas.ts` (+39): createTaskSchema, addContestantSchema, createRunSchema |
| Routes | `app/api/runs/route.ts` (POST+GET), `[id]/route.ts` (GET), `[id]/execute/route.ts` (POST) |
| Tests | `tests/unit/run/` (5 files), `tests/api/run/runs-api.test.ts` |

Review surface:
- `engine.ts` is the execution orchestrator. Status lifecycle: pending -> running -> completed/failed. sweepStaleRuns for zombie recovery.
- `queries.ts` joins run + task + contestants + traces. No Drizzle relations used -- manual multi-query assembly.
- All routes that take `[id]` params do NOT use `withLogging` (signature mismatch). Manual try/catch instead.

### Phase 2: Evaluation and Scoring

**#112** `32b737d` -- M2.1 Rubric schema
| Files | `db/schema.ts`, `drizzle/0008`, `lib/eval/rubrics.ts`, `lib/eval/types.ts`, `lib/eval/index.ts`, `lib/api-schemas.ts`, `lib/domain-ids.ts`, `tests/unit/eval/rubrics.test.ts` |
|---|---|

Review surface:
- `createRubricSchema` has 4 Zod refinements (weight sum, name uniqueness, scale min<max, label range). The weight tolerance is 0.01.
- `lib/eval/types.ts` was an existing file with EvalScore/RefusalEvalInput etc. New types appended, not replacing.

---

**#114** `f39638f` -- M2.2 Evaluator engine (LARGEST PR -- produced by autonomous agent)
| Layer | Files |
|---|---|
| Schema | `db/schema.ts` (evaluations table), `drizzle/0009` |
| Domain IDs | `lib/domain-ids.ts`: EvaluationId |
| Judge engine | `lib/eval/judge.ts` (359 lines): buildJudgePrompt, evaluateContestant, evaluateRun |
| Scoring | `lib/eval/scoring.ts` (185 lines): computeWeightedScore |
| Persistence | `lib/eval/evaluations.ts` (101 lines) |
| Routes | `app/api/runs/[id]/evaluate/route.ts`, `app/api/rubrics/route.ts`, `app/api/rubrics/[id]/route.ts` |
| Tests | `tests/unit/eval/judge.test.ts` (529 lines), `tests/unit/eval/scoring.test.ts`, `tests/api/eval/evaluate.test.ts`, `tests/api/eval/rubrics-api.test.ts` |

Review surface:
- **Judge reconciliation logic** is the highest-complexity code in the entire delivery. Case-insensitive name matching, missing criterion -> scale.min, extra criterion -> discard, out-of-range -> clamp. Each produces a ReconciliationEvent in metadata.
- Uses `generateObject` from AI SDK with Zod schema for structured output. A validation hook flagged this as deprecated in AI SDK v6 (should be `generateText` + `Output.object()`). The installed AI SDK version still has `generateObject` and typecheck passes. Worth verifying the installed version.
- `computeWeightedScore` normalizes to 0..1: `((score - min) / (max - min)) * weight`. Division by zero if min === max, but createRubricSchema enforces min < max.
- `evaluateRun` accepts 'completed' OR 'failed' runs. Skips error traces. Only rejects 'pending' and 'running'.

---

**#118** `656b2ef` -- M2.3 Scorecard and comparison (autonomous agent)
| Files | `lib/eval/scoring.ts` (extended), `lib/eval/types.ts`, `app/api/runs/[id]/scores/route.ts`, `app/api/comparisons/route.ts`, `tests/` |
|---|---|

Review surface:
- `compareRun()` determines winner by highest overallScore. Returns null on tie. Margin is the difference.
- The comparisons route takes query params (runId, rubricId) -- both required.

---

**#119** `379c96e` -- M2.4 Failure tagging (autonomous agent, rebased over M2.3)
| Files | `db/schema.ts`, `drizzle/0010_m2.4`, `lib/eval/failure-tags.ts`, `lib/eval/judge.ts` (patched), `app/api/runs/[id]/failures/route.ts`, `lib/api-schemas.ts`, `tests/` |
|---|---|

Review surface:
- **Migration number collision**: `drizzle/0010_m2.4-failure-tags.sql` and `drizzle/0010_m3.1-cost-ledger.sql` share the `0010` prefix. Both were created by parallel agents. Whether this causes issues depends on Drizzle's migration runner behavior.
- 9-value `failureCategory` enum. Judge extension adds optional `failureTags` to judge output schema.
- `addFailureTagSchema` uses a static `FAILURE_CATEGORIES` const rather than importing the pgEnum. Comment says this avoids breaking test mocks.

### Phase 3: Cost Visibility and MVP Surface

**#120** `0969b13` -- M3.1 Cost ledger (autonomous agent, rebased over M2.4, conflict resolved manually)
| Files | `db/schema.ts`, `drizzle/0010_m3.1`, `lib/run/pricing.ts`, `lib/run/engine.ts` (patched), `lib/eval/judge.ts` (patched), `tests/` |
|---|---|

Review surface:
- **Same migration collision** as noted above.
- `computeCostMicro` uses `Math.round()` for integer microdollars. Pricing table has 5 models.
- Engine patch: cost ledger entry inserted after every successful trace. Judge patch: cost ledger entry after every evaluation.
- Conflict resolution merged both M2.4 (failure tags) and M3.1 (cost entries) into `evaluateContestant()` in judge.ts. Review the ordering.

---

**#124** `9305527` -- M3.3 UI: run creation form (autonomous agent)
| Files | `app/(eval)/layout.tsx`, `app/(eval)/runs/new/page.tsx`, `components/eval/RunForm.tsx` (622 lines), `components/eval/ModelSelector.tsx` |
|---|---|

Review surface:
- `RunForm.tsx` is the largest single component (622 lines, 'use client'). Three-step wizard with dynamic lists for constraints and contestants.
- Uses `fetch('/api/runs', ...)` directly. Error handling pattern: shows error string in UI.
- Uses existing `PitButton` component, not shadcn. Plain HTML inputs with Tailwind.

---

**#125** `8f19e1e` -- M3.2 Economics endpoint (autonomous agent)
| Files | `lib/run/economics.ts`, `app/api/runs/[id]/economics/route.ts`, `tests/` |
|---|---|

Review surface:
- `scorePerDollar = overallScore / (costMicro / 1_000_000)`. Division by zero if costMicro is 0.
- `scorePerSecond = overallScore / (latencyMs / 1000)`. Division by zero if latencyMs is 0.

---

**#126** `4056b0d` -- M2.5 Run report (autonomous agent)
| Files | `lib/eval/report.ts`, `app/api/runs/[id]/report/route.ts`, `lib/eval/types.ts`, `tests/` |
|---|---|

Review surface:
- `assembleRunReport` is pure read. GET /report is safe/idempotent.
- Summary field: `buildSummaryPrompt` exists but is not called during assembly. Summary is always null until a future milestone wires it.
- Report requires rubricId query param. Only evaluations for that specific rubric are included.

---

**#129** `d609503` -- M3.4 UI: run report page (autonomous agent)
| Files | `app/(eval)/runs/[id]/page.tsx` (252 lines), `components/eval/` (6 new components) |
|---|---|

Review surface:
- Server component calls `requireDb()` directly. Data fetching at page level.
- `EvaluateButton.tsx` is a client component that takes a rubric ID via text input and POSTs to evaluate endpoint. No rubric selector/picker UI.
- `TraceViewer.tsx` uses `<details>/<summary>` for collapsibility.

---

**#130** `a4e5a3e` -- M3.5 UI: run list page (autonomous agent)
| Files | `app/(eval)/runs/page.tsx`, `components/eval/RunList.tsx`, `components/eval/StatusBadge.tsx` |
|---|---|

Review surface:
- Status filter tabs via query string `?status=completed`.
- Pagination via offset query param.
- `listRuns` called with `ownerId: userId ?? undefined` -- unauthenticated users see all runs.

## Cross-Cutting Review Vectors

These are not per-commit but span the entire delivery.

### V1: Migration ordering
8 migrations added (0004-0010). Two share the `0010` prefix (M2.4 and M3.1). Created by parallel agents that did not coordinate numbering. Check: does Drizzle sort by filename or track applied state separately?

### V2: Autonomous agent fidelity
9 of 11 commits were produced by autonomous agents with no human code review. Each agent received a detailed prompt but made independent implementation decisions. Cross-agent consistency (naming, error handling, mock patterns) is a review surface.

### V3: judge.ts layering
`lib/eval/judge.ts` was created by the M2.2 agent, then patched by M2.4 (failure tags) and M3.1 (cost ledger). The patches were applied via manual conflict resolution during rebases. The final function `evaluateContestant()` has three concerns layered: evaluation persistence, failure tag persistence, cost ledger persistence. Review the ordering and error handling if any layer fails.

### V4: Score normalization chain
Scores flow through: judge output (rubric-native scale) -> `computeWeightedScore` (0..1) -> `buildScorecard` -> `compareRun` -> `getRunEconomics` (scorePerDollar). Each stage assumes the previous produced correct values. An error at the normalization step propagates through the entire display chain.

### V5: Auth patterns
Routes use `auth()` from Clerk. Some mutation routes require auth (POST /runs, POST /evaluate, POST /failures). Some read routes do not (GET /runs/:id, GET /comparisons). The list route (`GET /api/runs`) scopes to `ownerId: userId ?? undefined`, meaning unauthenticated requests may see all runs. Compare with the UI list page behavior.

### V6: Test mock fidelity
All domain tests mock the Drizzle query chain (select/from/where/limit). These mocks do not validate query construction -- they test that functions call the mock chain and return expected shapes. Actual SQL correctness is untested. Integration tests exist in the repo (tests/integration/) but are skipped in CI for the run model.

### V7: AI SDK version
The codebase uses `generateObject` from the `ai` package. The Vercel plugin's validation hook flagged this as deprecated in AI SDK v6. Typecheck passes with the installed version. Check `package.json` / lockfile for the actual installed version and whether `generateObject` is stable or scheduled for removal.

### V8: Error propagation in executeRun/evaluateRun
Both orchestrators swallow per-contestant errors and continue. A single contestant failure does not abort the run/evaluation. The error is captured in the trace/evaluation record. Review: is the error message sufficient for debugging? Are there cases where continuing is incorrect?

## File Index by Category

### Schema + Migrations (review for DATA)
```
db/schema.ts                          (+291 lines across 4 commits)
drizzle/0004_m1.1-tasks.sql
drizzle/0005_m1.2-runs.sql
drizzle/0006_m1.3-contestants.sql
drizzle/0007_m1.4-traces.sql
drizzle/0008_m2.1-rubrics.sql
drizzle/0009_m2.2-evaluations.sql
drizzle/0010_m2.4-failure-tags.sql
drizzle/0010_m3.1-cost-ledger.sql     <-- collision with above
```

### Domain Logic (review for LOGIC, AI, COST)
```
lib/run/engine.ts                     Execution orchestrator
lib/run/pricing.ts                    MODEL_PRICING, computeCostMicro
lib/run/economics.ts                  scorePerDollar, scorePerSecond
lib/run/tasks.ts, runs.ts, contestants.ts, queries.ts   CRUD
lib/eval/judge.ts                     LLM-as-judge, reconciliation
lib/eval/scoring.ts                   computeWeightedScore, buildScorecard, compareRun
lib/eval/evaluations.ts               Evaluation persistence
lib/eval/failure-tags.ts              Failure tag CRUD
lib/eval/report.ts                    Report assembly
lib/eval/rubrics.ts                   Rubric CRUD
```

### API Routes (review for API, SECURITY)
```
app/api/runs/route.ts                 POST+GET
app/api/runs/[id]/route.ts            GET
app/api/runs/[id]/execute/route.ts    POST
app/api/runs/[id]/evaluate/route.ts   POST
app/api/runs/[id]/scores/route.ts     GET
app/api/runs/[id]/economics/route.ts  GET
app/api/runs/[id]/failures/route.ts   GET+POST
app/api/runs/[id]/report/route.ts     GET
app/api/rubrics/route.ts              POST+GET
app/api/rubrics/[id]/route.ts         GET
app/api/comparisons/route.ts          GET
```

### UI Components (review for UI)
```
app/(eval)/layout.tsx
app/(eval)/runs/page.tsx              Run list
app/(eval)/runs/new/page.tsx          Create run
app/(eval)/runs/[id]/page.tsx         Run report
components/eval/RunForm.tsx           622 lines, largest component
components/eval/ModelSelector.tsx
components/eval/RunList.tsx
components/eval/StatusBadge.tsx
components/eval/ScoreCard.tsx
components/eval/FailureTagBadge.tsx
components/eval/CostBreakdown.tsx
components/eval/ComparisonView.tsx
components/eval/TraceViewer.tsx
components/eval/EvaluateButton.tsx
```

### Tests (review for INTEGRATION, mock fidelity)
```
tests/unit/run/    (7 files)          tasks, runs, contestants, engine, queries, pricing, economics
tests/unit/eval/   (5 files)          rubrics, judge, scoring, failure-tags, report
tests/api/run/     (2 files)          runs-api, economics
tests/api/eval/    (5 files)          evaluate, rubrics-api, scores, failures, report
```

### Types + Schemas (review for DATA, API contract)
```
lib/domain-ids.ts                     7 branded types (Bout, User, Agent, Task, Run, Contestant, Trace, Rubric, Evaluation, FailureTag)
lib/run/types.ts                      Run model types
lib/eval/types.ts                     Eval model types (Rubric, Evaluation, CriterionScore, Scorecard, RunComparison, RunReport, FailureTag)
lib/api-schemas.ts                    Zod schemas for all request bodies
```
