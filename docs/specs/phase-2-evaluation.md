---
title: "Phase 2 - Evaluation and Scoring"
category: spec
status: draft
created: 2026-03-27
phase: 2
milestones: M2.1, M2.2, M2.3, M2.4, M2.5
depends_on: phase-1
---

# Phase 2 - Evaluation and Scoring

## Objective

Runs produce scores, not just outputs. Evaluation is explicit,
rubric-driven, and traceable. A judge model reads run traces,
scores them against a rubric, and produces rationale that is
persisted and inspectable.

## Design decisions

1. **LLM-as-judge.** The evaluator is a model call, not a
   hardcoded function. The judge model, judge prompt, and rubric
   are all configurable. This makes evaluation itself a first-class
   surface.

2. **Rubrics are reusable.** A rubric is a standalone entity that
   can be applied to many runs. Rubrics are not embedded in runs.

3. **Evaluations are immutable and append-only.** Once an evaluation
   is written, it is not updated. Re-evaluation creates a new record.
   This preserves the audit trail.

   **Concurrency:** Concurrent POST /evaluate requests for the same
   run+rubric are allowed. Each produces its own set of evaluation
   records. There is no uniqueness constraint on (runId, rubricId,
   contestantId) - multiple evaluations can exist for the same
   combination. This is deliberate: different judge models, or the
   same judge at different times, may produce different scores, and
   all are preserved.

   **Latest resolution:** When assembling reports or comparisons,
   "the latest evaluation" means the most recent by `createdAt` per
   (contestantId, rubricId). If two evaluations have identical
   timestamps (concurrent writes), the one with the higher `id`
   (lexicographic nanoid) wins. This is a tiebreaker, not a
   correctness guarantee - concurrent evaluation is safe but
   wasteful, not a design goal.

   **Idempotency:** POST /evaluate is NOT idempotent. Each call
   creates new evaluation records and incurs model costs. The client
   is responsible for not double-submitting. The UI disables the
   "Evaluate" button after click and shows progress. There is no
   server-side deduplication for MVP. Post-MVP: consider an
   idempotency key header if needed.

4. **Failure tags are orthogonal to scores.** A run can score
   well on some criteria and still have failure tags. They are
   separate concerns.

5. **Judge rationale is mandatory.** Every score must have a
   text rationale. Scores without rationale are score theater.

---

## Module map

```
db/schema.ts              Add: rubrics, evaluations, failure_tags tables
lib/domain-ids.ts         Add: RubricId, EvaluationId, FailureTagId branded types
lib/eval/                 Extend existing eval/ directory
  lib/eval/rubrics.ts     Rubric CRUD
  lib/eval/judge.ts       Judge engine (LLM-as-judge)
  lib/eval/evaluations.ts Evaluation persistence
  lib/eval/failure-tags.ts Failure tag CRUD
  lib/eval/scoring.ts     Score aggregation and comparison
lib/api-schemas.ts        Add: Zod schemas for evaluation endpoints
app/api/runs/[id]/
  scores/route.ts         GET scores for a run
  evaluate/route.ts       POST trigger evaluation
  failures/route.ts       GET/POST failure tags
app/api/rubrics/
  route.ts                POST (create), GET (list)
  [id]/route.ts           GET (single)
app/api/comparisons/
  route.ts                GET (side-by-side comparison)
tests/unit/eval/          Extend existing
tests/api/eval/           New test directory
```

### Interface boundaries

- `lib/eval/rubrics.ts` is pure CRUD. No AI calls.
- `lib/eval/judge.ts` is the only module that calls the AI SDK
  for evaluation. It takes a rubric + trace and returns structured
  scores. It depends on `lib/ai.ts` for model resolution.
- `lib/eval/evaluations.ts` is pure persistence. The judge writes
  evaluations; queries read them.
- `lib/eval/scoring.ts` is pure computation. It aggregates scores
  and produces comparisons. No database calls - it operates on
  in-memory data passed to it.
- `lib/eval/failure-tags.ts` is independent of scoring. Tags can
  be assigned manually (via API) or by the judge.

---

## M2.1 - Rubric schema

### Table: `rubrics`

```typescript
export const rubrics = pgTable('rubrics', {
  id: varchar('id', { length: 21 }).primaryKey(),     // nanoid, RubricId
  name: varchar('name', { length: 256 }).notNull(),
  description: text('description'),
  domain: varchar('domain', { length: 64 }),           // e.g. 'job-application'
  criteria: jsonb('criteria').$type<RubricCriterion[]>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Criterion type

```typescript
// lib/eval/types.ts

export type RubricCriterion = {
  name: string;           // e.g. "relevance", "specificity", "tone"
  description: string;    // what this criterion measures
  weight: number;         // 0-1, all weights should sum to 1
  scale: {
    min: number;          // typically 1
    max: number;          // typically 5
    labels?: Record<number, string>;  // e.g. { 1: "poor", 3: "adequate", 5: "excellent" }
  };
};
```

### Validation

```typescript
// lib/api-schemas.ts
export const rubricCriterionSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().min(1),
  weight: z.number().min(0).max(1),
  scale: z.object({
    min: z.number().int(),
    max: z.number().int(),
    labels: z.record(z.coerce.number(), z.string()).optional(),
  }),
});

export const createRubricSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  domain: z.string().max(64).optional(),
  criteria: z.array(rubricCriterionSchema).min(1),
}).refine(
  (data) => {
    // Tolerance: 0.01. This allows 3 criteria at 0.333 each (sum=0.999).
    // Tighter tolerance (e.g. 0.001) would reject common equal-weight
    // rubrics with non-terminating decimals. Looser tolerance (e.g. 0.1)
    // would allow meaningfully unbalanced rubrics to pass silently.
    const sum = data.criteria.reduce((s, c) => s + c.weight, 0);
    return Math.abs(sum - 1) < 0.01;
  },
  { message: 'Criterion weights must sum to 1 (tolerance: 0.01)' },
).refine(
  (data) => {
    const names = data.criteria.map(c => c.name.toLowerCase());
    return new Set(names).size === names.length;
  },
  { message: 'Criterion names must be unique (case-insensitive)' },
).refine(
  (data) => data.criteria.every(c => c.scale.min < c.scale.max),
  { message: 'Scale min must be strictly less than scale max' },
).refine(
  (data) => data.criteria.every(c =>
    !c.scale.labels || Object.keys(c.scale.labels).every(k => {
      const n = Number(k);
      return n >= c.scale.min && n <= c.scale.max;
    })
  ),
  { message: 'Scale labels must reference values within the scale range' },
);
```

### Domain module

```typescript
// lib/eval/rubrics.ts
export async function createRubric(
  db: DbOrTx,
  input: CreateRubricInput,
): Promise<Rubric> { ... }

export async function getRubric(
  db: DbOrTx,
  id: RubricId,
): Promise<Rubric | null> { ... }

export async function listRubrics(
  db: DbOrTx,
  opts?: { domain?: string; limit?: number },
): Promise<Rubric[]> { ... }
```

### Tests

- tests/unit/eval/rubrics.test.ts
  - createRubric persists with id
  - createRubric validates weights sum to 1
  - createRubric requires at least 1 criterion
  - createRubric rejects duplicate criterion names (case-insensitive)
  - createRubric rejects scale.min >= scale.max
  - createRubric rejects scale labels outside scale range
  - getRubric returns null for missing id
  - listRubrics filters by domain

### PR scope
- 1 migration, 1 branded type, types, Zod schema, domain module, tests

---

## M2.2 - Evaluator engine

### Table: `evaluations`

```typescript
export const evaluations = pgTable('evaluations', {
  id: varchar('id', { length: 21 }).primaryKey(),      // nanoid, EvaluationId
  runId: varchar('run_id', { length: 21 })
    .notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  contestantId: varchar('contestant_id', { length: 21 })
    .notNull()
    .references(() => contestants.id, { onDelete: 'cascade' }),
  rubricId: varchar('rubric_id', { length: 21 })
    .notNull()
    .references(() => rubrics.id),
  judgeModel: varchar('judge_model', { length: 128 }).notNull(),
  scores: jsonb('scores').$type<CriterionScore[]>().notNull(),
  overallScore: real('overall_score').notNull(),        // weighted aggregate
  rationale: text('rationale').notNull(),               // judge's explanation
  rawJudgeResponse: text('raw_judge_response'),         // full model output for audit
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  latencyMs: integer('latency_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('evaluations_run_id_idx').on(table.runId),
  index('evaluations_contestant_id_idx').on(table.contestantId),
  index('evaluations_rubric_id_idx').on(table.rubricId),
]);
```

### Score type

```typescript
// lib/eval/types.ts
export type CriterionScore = {
  criterionName: string;
  score: number;
  rationale: string;      // per-criterion rationale
};
```

### Judge interface

```typescript
// lib/eval/judge.ts

export type JudgeConfig = {
  model: string;            // judge model identifier
  rubricId: RubricId;
  temperature?: number;     // default 0 for consistency
};

/**
 * Evaluate a single contestant's trace against a rubric.
 * Returns structured scores with rationale.
 *
 * The judge prompt is structured to produce JSON output:
 * { scores: CriterionScore[], overallRationale: string }
 *
 * Uses generateText with JSON mode (Vercel AI SDK structured output).
 */
export async function evaluateContestant(
  db: DbOrTx,
  config: JudgeConfig,
  trace: Trace,
  task: Task,
  rubric: Rubric,
): Promise<Evaluation> { ... }

/**
 * Evaluate all contestants in a run against a rubric.
 * Sequential execution for deterministic ordering.
 *
 * Accepts runs in 'completed' OR 'failed' status. Failed runs may
 * have partial traces (some contestants succeeded, some errored).
 * Contestants with successful traces are evaluated normally.
 * Contestants with error traces are skipped for scoring but are
 * still eligible for failure tagging (the error itself is a
 * classifiable failure). This is intentional: the spec's failure
 * analysis goals require that fully-failed runs remain inspectable.
 *
 * Only 'pending' and 'running' runs are rejected (not yet terminal).
 */
export async function evaluateRun(
  db: DbOrTx,
  runId: RunId,
  config: JudgeConfig,
): Promise<Evaluation[]> { ... }
```

### Judge prompt construction

```typescript
// lib/eval/judge.ts (internal)

function buildJudgePrompt(
  task: Task,
  rubric: Rubric,
  contestantResponse: string,
): TraceMessage[] {
  return [
    {
      role: 'system',
      content: `You are an evaluation judge. You score outputs against explicit rubrics.
You must provide a numeric score and text rationale for EVERY criterion.
You must be specific about what the output did well and what it missed.
Do not award high scores for fluency alone. Evaluate substance.`,
    },
    {
      role: 'user',
      content: `## Task
${task.prompt}

## Rubric
${rubric.criteria.map(c =>
  `### ${c.name} (weight: ${c.weight}, scale: ${c.scale.min}-${c.scale.max})
${c.description}
${c.scale.labels ? Object.entries(c.scale.labels).map(([k, v]) => `  ${k}: ${v}`).join('\n') : ''}`
).join('\n\n')}

## Output to evaluate
${contestantResponse}

## Instructions
Score the output against each criterion. Return JSON:
{
  "scores": [
    { "criterionName": "...", "score": N, "rationale": "..." }
  ],
  "overallRationale": "..."
}`,
    },
  ];
}
```

### Output parsing

Uses Vercel AI SDK's `generateObject()` with a Zod schema for
structured output. If the model doesn't support structured output,
fall back to `generateText()` + JSON.parse() with validation.

```typescript
import { generateObject } from 'ai';

const judgeOutputSchema = z.object({
  scores: z.array(z.object({
    criterionName: z.string(),
    score: z.number(),
    rationale: z.string().min(1),
  })),
  overallRationale: z.string().min(1),
});
```

### Judge output reconciliation

The judge is an LLM. Its output will not always match the rubric
perfectly. The reconciliation rules are:

1. **Name matching:** Case-insensitive, trimmed. The judge prompt
   includes exact criterion names from the rubric; matching is
   done against those canonical names.
2. **Missing criterion:** If the judge omits a rubric criterion,
   that criterion scores 0 (scale minimum) and the evaluation is
   flagged with `reconciliation: 'missing_criterion'` in metadata.
   This is a judge failure, not a contestant failure.
3. **Extra criterion:** If the judge returns a criterion not in the
   rubric, it is discarded. Logged in `rawJudgeResponse` for audit.
4. **Score out of range:** If the judge returns a score outside
   `[scale.min, scale.max]`, clamp to range before normalizing.
   Flagged in metadata.
5. **Misspelled name:** No fuzzy matching. If the name doesn't
   match any rubric criterion exactly (case-insensitive, trimmed),
   treat as extra (discard) and the real criterion as missing
   (score 0). This is strict by design - fuzzy matching introduces
   ambiguity that is worse than a zero score.

The `reconciliation` metadata field on the evaluation record tracks
any of these events. An evaluation with no reconciliation flags is
a clean evaluation.

```typescript
// Added to Evaluation type
metadata: {
  reconciliation?: Array<{
    type: 'missing_criterion' | 'extra_criterion' | 'score_clamped' | 'parse_fallback';
    criterionName: string;
    detail?: string;
  }>;
} | null;
```

### Score computation

**Score unit convention:** All `overallScore` values are normalized
to the 0..1 range. Per-criterion `score` values remain in rubric-
native scale (e.g. 1-5). The `weightedScore` on a scorecard is
the normalized contribution: `((score - min) / (max - min)) * weight`.
The `overallScore` is the sum of all `weightedScore` values, always
in 0..1.

This convention is load-bearing. Phase 3 economics (`scorePerDollar`,
winner `margin`) depends on scores being in a consistent unit.
Cross-rubric comparisons are valid only because normalization makes
different scales commensurable.

```typescript
// lib/eval/scoring.ts (pure function, no DB)

export function computeWeightedScore(
  scores: CriterionScore[],
  criteria: RubricCriterion[],
): number {
  // Match scores to criteria by name (case-insensitive)
  // For each criterion:
  //   normalized = (score - scale.min) / (scale.max - scale.min)  // 0..1
  //   weightedScore = normalized * criterion.weight
  // overallScore = sum of all weightedScores  // 0..1
  //
  // Invariant: scale.min < scale.max is enforced at rubric creation (M2.1)
  // Invariant: criterion names are unique (M2.1)
  // If a score is outside [min, max], clamp before normalizing
}
```

### Tests

- tests/unit/eval/judge.test.ts
  - buildJudgePrompt includes all rubric criteria
  - buildJudgePrompt includes task prompt and contestant response
  - evaluateContestant persists evaluation with scores
  - evaluateContestant captures judge token usage
  - evaluateContestant handles judge model error gracefully
  - evaluateContestant scores missing criterion as scale minimum with reconciliation flag
  - evaluateContestant discards extra criterion from judge output
  - evaluateContestant clamps out-of-range scores with reconciliation flag
  - evaluateContestant treats misspelled criterion as missing (no fuzzy match)
  - evaluateRun evaluates all contestants in a run
  - evaluateRun accepts completed runs
  - evaluateRun accepts failed runs with partial traces
  - evaluateRun skips error traces for scoring but tags failures
  - evaluateRun rejects pending and running runs

- tests/unit/eval/scoring.test.ts
  - computeWeightedScore computes correctly with uniform weights
  - computeWeightedScore respects weight differences
  - computeWeightedScore normalizes to 0-1 range
  - computeWeightedScore handles missing criterion gracefully

### PR scope
- 1 migration, 1 branded type, judge engine, scoring module, tests
- This is the largest PR in Phase 2.

---

## M2.3 - Scorecard and comparison

No new tables. This milestone is query and aggregation logic.

### Scorecard

```typescript
// lib/eval/scoring.ts

export type Scorecard = {
  runId: RunId;
  contestantId: ContestantId;
  contestantLabel: string;
  rubricName: string;
  overallScore: number;          // normalized 0..1 (sum of weightedScores)
  criterionScores: Array<{
    name: string;
    score: number;               // rubric-native scale (e.g. 1-5)
    normalizedScore: number;     // 0..1 within criterion scale
    weight: number;
    weightedScore: number;       // normalizedScore * weight
    rationale: string;
  }>;
};

export function buildScorecard(
  evaluation: Evaluation,
  contestant: Contestant,
  rubric: Rubric,
): Scorecard { ... }
```

### Comparison

```typescript
// lib/eval/scoring.ts

export type RunComparison = {
  taskName: string;
  rubricName: string;
  contestants: Scorecard[];
  winner: {
    contestantId: ContestantId;
    label: string;
    margin: number;        // difference in overallScore (0..1 normalized)
  } | null;                // null if tied
  criterionBreakdown: Array<{
    criterionName: string;
    scores: Array<{ contestantLabel: string; score: number }>;
    winner: string | null;
  }>;
};

export function compareRun(
  evaluations: Evaluation[],
  contestants: Contestant[],
  rubric: Rubric,
  task: Task,
): RunComparison { ... }
```

### API routes

```typescript
// app/api/runs/[id]/scores/route.ts
// GET /api/runs/:id/scores
// Returns: Scorecard[] for all contestants in the run

// app/api/comparisons/route.ts
// GET /api/comparisons?runId=xxx&rubricId=yyy
// Returns: RunComparison
```

### Tests

- tests/unit/eval/scoring.test.ts (comparison subset)
  - buildScorecard computes weighted scores correctly
  - compareRun identifies winner by highest overall score
  - compareRun returns null winner on tie
  - compareRun includes per-criterion breakdown
  - compareRun handles single contestant (no comparison)

- tests/api/eval/scores.test.ts
  - GET /api/runs/:id/scores returns scorecards (200)
  - GET /api/runs/:id/scores returns 404 for missing run
  - GET /api/comparisons returns comparison (200)
  - GET /api/comparisons requires runId and rubricId (400)

### PR scope
- Scoring logic, comparison logic, 2 route files, tests
- No migrations.

---

## M2.4 - Failure tagging

### Table: `failure_tags`

```typescript
export const failureCategory = pgEnum('failure_category', [
  'wrong_answer',
  'partial_answer',
  'refusal',
  'off_topic',
  'unsafe_output',
  'hallucination',
  'format_violation',
  'context_misuse',       // used wrong context or ignored relevant context
  'instruction_violation', // violated explicit constraints
]);

export const failureTags = pgTable('failure_tags', {
  id: varchar('id', { length: 21 }).primaryKey(),      // nanoid, FailureTagId
  runId: varchar('run_id', { length: 21 })
    .notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  contestantId: varchar('contestant_id', { length: 21 })
    .notNull()
    .references(() => contestants.id, { onDelete: 'cascade' }),
  category: failureCategory('category').notNull(),
  description: text('description'),                     // specific detail
  source: varchar('source', { length: 32 }).notNull(),  // 'manual' | 'judge'
  evaluationId: varchar('evaluation_id', { length: 21 })
    .references(() => evaluations.id),                  // null if manual
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('failure_tags_run_id_idx').on(table.runId),
  index('failure_tags_contestant_id_idx').on(table.contestantId),
  index('failure_tags_category_idx').on(table.category),
]);
```

### Domain module

```typescript
// lib/eval/failure-tags.ts

export async function addFailureTag(
  db: DbOrTx,
  input: AddFailureTagInput,
): Promise<FailureTag> { ... }

export async function getFailureTagsForRun(
  db: DbOrTx,
  runId: RunId,
): Promise<FailureTag[]> { ... }

export async function getFailureTagsForContestant(
  db: DbOrTx,
  contestantId: ContestantId,
): Promise<FailureTag[]> { ... }

// Aggregate for reporting
export async function getFailureDistribution(
  db: DbOrTx,
  opts?: { runId?: RunId; domain?: string },
): Promise<Record<FailureCategory, number>> { ... }
```

### Judge integration

The judge in M2.2 can also produce failure tags. Extend the judge
output schema:

```typescript
const judgeOutputSchema = z.object({
  scores: z.array(...),
  overallRationale: z.string().min(1),
  failureTags: z.array(z.object({
    category: z.enum([...failureCategories]),
    description: z.string(),
  })).optional(),   // judge may or may not identify failures
});
```

When the judge returns failure tags, `evaluateContestant()` persists
them with `source: 'judge'`.

### API routes

```typescript
// app/api/runs/[id]/failures/route.ts
// GET  - list failure tags for the run
// POST - add a manual failure tag
```

### Validation

```typescript
export const addFailureTagSchema = z.object({
  contestantId: z.string().length(21),
  category: z.enum([...failureCategories]),
  description: z.string().optional(),
});
```

### Tests

- tests/unit/eval/failure-tags.test.ts
  - addFailureTag persists with category and source
  - getFailureTagsForRun returns all tags for a run
  - getFailureDistribution returns correct counts
  - judge-assigned tags link to evaluationId

- tests/api/eval/failures.test.ts
  - POST /api/runs/:id/failures creates tag (201)
  - POST /api/runs/:id/failures validates category enum (400)
  - GET /api/runs/:id/failures returns tags (200)

### PR scope
- 1 migration, 1 enum, 1 branded type, domain module, judge
  extension (patch to M2.2 code), route, tests

---

## M2.5 - Run report

No new tables. This milestone assembles existing data into a
composite report.

### Report type

```typescript
// lib/eval/types.ts

export type RunReport = {
  run: Run;
  task: Task;
  rubric: Rubric;
  needsEvaluation: boolean;             // true if no evaluations exist for this rubric
  contestants: Array<{
    contestant: Contestant;
    trace: Trace | null;                // null for failed contestants with no trace
    scorecard: Scorecard | null;
    failureTags: FailureTag[];
  }>;
  comparison: RunComparison | null;     // null if not yet evaluated
  summary: string | null;               // null if not yet evaluated
};
```

### Report generation

```typescript
// lib/eval/report.ts

/**
 * Assemble a run report from existing data. Pure read - no model
 * calls, no writes. If evaluations exist for the rubric, includes
 * scorecards, comparison, and pre-generated summary. If not,
 * returns the report shell with needsEvaluation=true.
 *
 * Summary generation happens during evaluateRun (Phase 2 M2.2),
 * not during report assembly.
 */
export async function assembleRunReport(
  db: DbOrTx,
  runId: RunId,
  rubricId: RubricId,
): Promise<RunReport> { ... }
```

### Summary generation

```typescript
// lib/eval/report.ts (internal)

function buildSummaryPrompt(
  comparison: RunComparison,
  contestants: RunReport['contestants'],
): TraceMessage[] {
  return [
    {
      role: 'system',
      content: `You are a technical report writer. Summarize evaluation results.
Be specific about what each contestant did well and poorly.
Reference specific criterion scores and failure tags.
Do not use filler language. State facts and conclusions.`,
    },
    {
      role: 'user',
      content: `## Comparison data
${JSON.stringify(comparison, null, 2)}

## Failure tags
${contestants.map(c =>
  `${c.contestant.label}: ${c.failureTags.length > 0
    ? c.failureTags.map(t => `${t.category}: ${t.description}`).join('; ')
    : 'none'}`
).join('\n')}

Write a 2-3 paragraph summary explaining:
1. Which contestant won and by what margin
2. The key criteria where they differed
3. Any failure patterns observed
4. Whether the result is decisive or marginal`,
    },
  ];
}
```

### API route

Report generation is pure assembly. It reads existing evaluations
and composes them into a report. It does NOT trigger evaluation.
If the run has not been evaluated, the report returns with null
scores and a `needsEvaluation: true` flag. The client must call
POST /evaluate explicitly before requesting a report with scores.

This separation exists because:
- GET must be safe and idempotent (no side effects on read)
- Evaluation creates append-only records and incurs model costs
- Browser refreshes, crawlers, and retries must not create duplicate
  evaluations or duplicate charges
- The UI shows an explicit "Evaluate" button that calls POST /evaluate

```typescript
// app/api/runs/[id]/report/route.ts

// GET /api/runs/:id/report?rubricId=xxx
// Returns: RunReport (200)
// Pure assembly - reads existing data, never writes.
// If not yet evaluated: scores=null, comparison=null,
// summary=null, needsEvaluation=true.

export const GET = withLogging(async function GET(req, { params }) {
  // 1. Load run (any terminal status: completed or failed)
  // 2. Load traces and cost data
  // 3. Check for existing evaluations with rubricId
  // 4. If evaluations exist: assemble scorecards, comparison, summary
  // 5. If not: return report shell with needsEvaluation=true
  // 6. Return report (never writes)
}, 'run-report');
```

### Tests

- tests/unit/eval/report.test.ts
  - generateRunReport assembles all data correctly
  - generateRunReport includes comparison and failure tags
  - buildSummaryPrompt references specific scores
  - generateRunReport handles unevaluated run (triggers eval)

- tests/api/eval/report.test.ts
  - GET /api/runs/:id/report returns complete report (200)
  - GET /api/runs/:id/report requires rubricId (400)
  - GET /api/runs/:id/report returns 404 for missing run

### PR scope
- Report assembly module, summary generation, 1 route file, tests
- No migrations.

---

## On-product governance (parallel track)

See `docs/specs/on-product-governance.md` for full detail. Per-PR:
- GitHub issue with acceptance criteria and `spec-attached` label
- PR description with evaluation criteria
- Append to `docs/internal/dev-cost-ledger.yaml`
- Classify any failures caught (gate, review, or manual)

At Phase 2 gate: write `docs/internal/retros/phase-2-retro.md`.

---

## Phase 2 gate checklist

Before proceeding to Phase 3, verify:

- [ ] Can create rubrics with weighted criteria
- [ ] Can evaluate a completed run against a rubric
- [ ] Evaluation produces per-criterion scores with rationale
- [ ] Judge rationale is persisted and retrievable
- [ ] Can compare two contestants with per-criterion breakdown
- [ ] Winner is identified with margin
- [ ] Failure tags can be assigned manually and by judge
- [ ] Failure distribution is queryable
- [ ] Run report assembles all data with generated summary
- [ ] All existing tests still pass (zero regressions)
- [ ] Gate green: typecheck + lint + test
