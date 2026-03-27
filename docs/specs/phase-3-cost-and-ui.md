---
title: "Phase 3 - Cost Visibility and MVP Surface"
category: spec
status: draft
created: 2026-03-27
phase: 3
milestones: M3.1, M3.2, M3.3, M3.4, M3.5
depends_on: phase-2
---

# Phase 3 - Cost Visibility and MVP Surface

## Objective

Every run exposes cost, latency, and token usage. A minimal UI
makes the MVP usable beyond API calls. At the end of this phase,
the MVP sentence is satisfied:

> Run a structured task between two or more agent configurations,
> evaluate outputs, store traces, show scores, show failure tags,
> and show cost.

## Design decisions

1. **Cost is derived, not metered.** Token counts come from traces
   (Phase 1). Cost is computed from a pricing table maintained in
   code. No external billing integration for MVP.

2. **Pricing table is a code constant.** Model pricing changes
   frequently. A JSONB table would be over-engineering. A TypeScript
   constant in `lib/run/pricing.ts` is sufficient and easy to update.

3. **UI is server-rendered.** Next.js 16 app router, server
   components by default. No client-side state management for MVP.
   Forms use server actions or POST to API routes.

4. **UI is functional, not polished.** Existing shadcn/ui component
   library. No new design system work. The point is usability, not
   aesthetics.

---

## Module map

```
db/schema.ts              Add: cost_ledger table
lib/run/pricing.ts        Model pricing table
lib/run/economics.ts      Cost computation and aggregation
lib/api-schemas.ts        Add: economics endpoint schema
app/api/runs/[id]/
  economics/route.ts      GET economics for a run
app/(eval)/               New route group for evaluation UI
  app/(eval)/runs/
    page.tsx              Run list page
    new/page.tsx          Create run page
    [id]/page.tsx         Run report page
components/eval/          New component directory
  RunForm.tsx             Task + contestant form
  RunList.tsx             Run list table
  ScoreCard.tsx           Score display per contestant
  FailureTagBadge.tsx     Failure tag display
  CostBreakdown.tsx       Cost/token display
  ComparisonView.tsx      Side-by-side comparison
tests/unit/run/           Extend
tests/api/run/            Extend
```

### Interface boundaries

- `lib/run/pricing.ts` is a pure data module. No imports except
  types. No side effects. Exports the pricing table and a lookup
  function.
- `lib/run/economics.ts` depends on pricing.ts and operates on
  trace data. Pure computation - no database calls. Takes traces
  in, returns economics out.
- UI components are server components unless they need interactivity
  (forms). Form components use `'use client'` only where required.
- UI pages call `lib/run/` functions directly (server components
  can call server-side code). No API round-trip for page rendering.

---

## M3.1 - Cost ledger

### Table: `cost_ledger`

The cost ledger must represent two kinds of billable model call:
contestant execution traces (Phase 1) and judge evaluation calls
(Phase 2). Rather than a foreign key to one specific table, the
ledger uses a `sourceType` + `sourceId` pair that can reference
either.

```typescript
export const costSourceType = pgEnum('cost_source_type', [
  'trace',       // contestant execution (traces.id)
  'evaluation',  // judge evaluation call (evaluations.id)
  'summary',     // report summary generation (evaluations.id or runId)
]);

export const costLedger = pgTable('cost_ledger', {
  id: varchar('id', { length: 21 }).primaryKey(),      // nanoid
  sourceType: costSourceType('source_type').notNull(),
  sourceId: varchar('source_id', { length: 21 }).notNull(), // traces.id, evaluations.id, or runs.id
  runId: varchar('run_id', { length: 21 })
    .notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  contestantId: varchar('contestant_id', { length: 21 })
    .references(() => contestants.id, { onDelete: 'cascade' }), // null for summary costs
  model: varchar('model', { length: 128 }).notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  inputCostMicro: integer('input_cost_micro').notNull(),   // cost in microdollars
  outputCostMicro: integer('output_cost_micro').notNull(),
  totalCostMicro: integer('total_cost_micro').notNull(),
  latencyMs: integer('latency_ms').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('cost_ledger_run_id_idx').on(table.runId),
  index('cost_ledger_contestant_id_idx').on(table.contestantId),
  index('cost_ledger_source_idx').on(table.sourceType, table.sourceId),
]);
```

Costs are stored in **microdollars** (1 microdollar = $0.000001)
to avoid floating-point issues, matching the existing credit system
pattern (`balanceMicro`, `deltaMicro` in credits/creditTransactions).

### Pricing table

```typescript
// lib/run/pricing.ts

export type ModelPricing = {
  inputPer1kTokens: number;   // dollars
  outputPer1kTokens: number;  // dollars
};

// Prices in dollars per 1k tokens. Updated manually.
export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o':            { inputPer1kTokens: 0.0025,  outputPer1kTokens: 0.01 },
  'gpt-4o-mini':       { inputPer1kTokens: 0.00015, outputPer1kTokens: 0.0006 },
  'claude-sonnet-4-20250514': { inputPer1kTokens: 0.003,  outputPer1kTokens: 0.015 },
  'claude-haiku-3.5':  { inputPer1kTokens: 0.0008,  outputPer1kTokens: 0.004 },
  'gemini-2.0-flash':  { inputPer1kTokens: 0.0001,  outputPer1kTokens: 0.0004 },
  // ... extend as needed
};

export function getModelPricing(model: string): ModelPricing | null {
  return MODEL_PRICING[model] ?? null;
}

export function computeCostMicro(
  model: string,
  inputTokens: number,
  outputTokens: number,
): { inputCostMicro: number; outputCostMicro: number; totalCostMicro: number } | null {
  const pricing = getModelPricing(model);
  if (!pricing) return null;
  const inputCostMicro = Math.round((inputTokens / 1000) * pricing.inputPer1kTokens * 1_000_000);
  const outputCostMicro = Math.round((outputTokens / 1000) * pricing.outputPer1kTokens * 1_000_000);
  return {
    inputCostMicro,
    outputCostMicro,
    totalCostMicro: inputCostMicro + outputCostMicro,
  };
}
```

### Integration with engine

The cost ledger is populated during run execution (M1.4). After each
trace is written, a cost ledger entry is computed and persisted.

This requires a **patch to `lib/run/engine.ts`** (from Phase 1):

```typescript
// After trace is persisted in executeRun:
const cost = computeCostMicro(trace.requestModel, trace.inputTokens, trace.outputTokens);
if (cost) {
  await db.insert(costLedger).values({
    id: nanoid(),
    sourceType: 'trace',
    sourceId: trace.id,
    runId: run.id,
    contestantId: contestant.id,
    model: trace.requestModel,
    inputTokens: trace.inputTokens ?? 0,
    outputTokens: trace.outputTokens ?? 0,
    ...cost,
    latencyMs: trace.latencyMs ?? 0,
  });
}
```

The same pattern applies to evaluation judge calls (patch to M2.2)
and report summary generation (patch to M2.5):

```typescript
// After evaluation is persisted in evaluateContestant:
await db.insert(costLedger).values({
  id: nanoid(),
  sourceType: 'evaluation',
  sourceId: evaluation.id,
  runId,
  contestantId,
  model: config.model,
  inputTokens: evaluation.inputTokens ?? 0,
  outputTokens: evaluation.outputTokens ?? 0,
  ...computeCostMicro(config.model, evaluation.inputTokens, evaluation.outputTokens),
  latencyMs: evaluation.latencyMs ?? 0,
});

// After summary generation in generateRunReport:
await db.insert(costLedger).values({
  id: nanoid(),
  sourceType: 'summary',
  sourceId: runId,
  runId,
  contestantId: null,  // summary is run-level, not contestant-level
  model: summaryModel,
  ...summaryCost,
});
```

### Tests

- tests/unit/run/pricing.test.ts
  - computeCostMicro computes correctly for known model
  - computeCostMicro returns null for unknown model
  - computeCostMicro rounds to integer microdollars
  - getModelPricing returns pricing for each listed model

- tests/unit/run/economics.test.ts (cost ledger queries)
  - cost entries created alongside traces
  - cost entries link to correct trace, run, contestant

### PR scope
- 1 migration, pricing module, engine patch, tests

---

## M3.2 - Score/cost tradeoff endpoint

No new tables. Pure computation over existing data.

### Economics module

```typescript
// lib/run/economics.ts

export type RunEconomics = {
  runId: RunId;
  totalCostMicro: number;
  totalTokens: number;
  totalLatencyMs: number;
  contestants: Array<{
    contestantId: ContestantId;
    label: string;
    model: string;
    costMicro: number;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    // Score fields (null if not yet evaluated)
    // All scores are normalized 0..1 (see Phase 2 score unit convention)
    overallScore: number | null;      // 0..1 normalized
    scorePerDollar: number | null;    // overallScore / (costMicro / 1_000_000)
    scorePerSecond: number | null;    // overallScore / (latencyMs / 1000)
  }>;
  // Summary
  cheapestContestant: string | null;
  fastestContestant: string | null;
  bestValueContestant: string | null;  // highest score-per-dollar
};

export async function getRunEconomics(
  db: DbOrTx,
  runId: RunId,
): Promise<RunEconomics | null> { ... }
```

### API route

```typescript
// app/api/runs/[id]/economics/route.ts
// GET /api/runs/:id/economics
// Returns: RunEconomics (200) or 404

export const GET = withLogging(async function GET(req, { params }) {
  const { id } = await params;
  const db = requireDb();
  const economics = await getRunEconomics(db, toRunId(id));
  if (!economics) return errorResponse('Run not found', 404);
  return Response.json(economics);
}, 'run-economics');
```

### Tests

- tests/unit/run/economics.test.ts
  - getRunEconomics computes total cost across contestants
  - getRunEconomics computes score-per-dollar correctly
  - getRunEconomics computes score-per-second correctly
  - getRunEconomics identifies cheapest and fastest contestants
  - getRunEconomics handles missing evaluations (scores null)

- tests/api/run/economics.test.ts
  - GET /api/runs/:id/economics returns economics (200)
  - GET /api/runs/:id/economics returns 404 for missing run

### PR scope
- Economics module, 1 route file, tests. No migrations.

---

## M3.3 - MVP UI: Run creation

### Page: `app/(eval)/runs/new/page.tsx`

Server component with a client form component.

**User flow:**
1. User enters task details (name, prompt, constraints, criteria)
2. User adds 2+ contestant configs (model, system prompt, context)
3. User submits - run is created (POST /api/runs, returns pending)
4. Client calls POST /api/runs/:id/execute
5. While executing: show progress indicator on run report page
6. On completion: report page renders with traces and cost data
7. User clicks "Evaluate" to trigger scoring (POST /api/runs/:id/evaluate)

### Components

```typescript
// components/eval/RunForm.tsx ('use client')

// Multi-step form:
// Step 1: Task definition
//   - name, prompt, constraints (dynamic list), acceptance criteria (dynamic list)
//   - domain selector
//   - OR: select existing task from dropdown
//
// Step 2: Contestants
//   - Contestant cards (add/remove, minimum 2)
//   - Each card: label, model (dropdown from known models), system prompt,
//     temperature, context documents (add/remove)
//
// Step 3: Confirm and run
//   - Summary of task and contestants
//   - "Run" button
//
// Submits to POST /api/runs
// On success: redirect to /runs/:id

export function RunForm() { ... }
```

```typescript
// components/eval/ModelSelector.tsx ('use client')
// Dropdown of available models from lib/run/pricing.ts keys
// Shows pricing info next to each option

export function ModelSelector({ value, onChange }: Props) { ... }
```

### Layout

```typescript
// app/(eval)/layout.tsx
// Minimal layout - reuse existing nav/shell if present
// Sidebar with: Runs, Tasks, Rubrics links

export default function EvalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-48 border-r p-4">
        {/* nav links */}
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

### Tests

- tests/unit/eval/run-form.test.ts (if component testing is in scope)
  - Otherwise: API-level tests from M1.5 cover creation
  - E2E test added in M3.5

### PR scope
- Layout, page, form components, model selector. No backend changes.

---

## M3.4 - MVP UI: Run report

### Page: `app/(eval)/runs/[id]/page.tsx`

Server component. Fetches run data directly via lib/run/ functions.

**Displays:**
1. Task details (name, prompt, constraints, criteria)
2. Per-contestant panel:
   - Model and config summary
   - Response content (full trace output)
   - Scorecard (if evaluated)
   - Failure tags (if any)
   - Cost/token/latency breakdown
3. Side-by-side comparison (if 2+ contestants evaluated)
4. Winner declaration with margin
5. Generated summary (from report)
6. Economics summary (cheapest, fastest, best value)

### Components

```typescript
// components/eval/ScoreCard.tsx
// Displays per-criterion scores with weights, rationale
// Visual: progress bars or simple table

// components/eval/FailureTagBadge.tsx
// Colored badge per failure category
// Tooltip with description

// components/eval/CostBreakdown.tsx
// Shows: model, input tokens, output tokens, cost, latency
// Shows: score-per-dollar, score-per-second if evaluated

// components/eval/ComparisonView.tsx
// Two-column layout comparing contestants
// Highlights winner per criterion
// Shows overall winner with margin

// components/eval/TraceViewer.tsx
// Collapsible display of full request/response messages
// Syntax highlighting for JSON/code responses
```

### Data fetching

```typescript
// app/(eval)/runs/[id]/page.tsx
import { getRunWithTraces } from '@/lib/run/queries';
import { generateRunReport } from '@/lib/eval/report';
import { getRunEconomics } from '@/lib/run/economics';

export default async function RunReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = requireDb();

  const run = await getRunWithTraces(db, toRunId(id));
  if (!run) notFound();

  const economics = await getRunEconomics(db, toRunId(id));

  // Report is optional - may not be evaluated yet
  let report: RunReport | null = null;
  // Check if evaluations exist; if so, build report
  // If not, show "not yet evaluated" with evaluate button

  return (
    <div>
      {/* Task section */}
      {/* Contestants with traces */}
      {/* Comparison (if evaluated) */}
      {/* Economics */}
      {/* Evaluate button (if not yet evaluated) */}
    </div>
  );
}
```

### Evaluate action

The report page includes an "Evaluate" button if the run has not
been evaluated. This calls POST /api/runs/:id/evaluate (from Phase 2)
with a selected rubric.

```typescript
// app/api/runs/[id]/evaluate/route.ts
// POST /api/runs/:id/evaluate
// Body: { rubricId: string, judgeModel?: string }
// Returns: Evaluation[] (201)
```

### Tests

- E2E test in M3.5
- Component rendering can be tested if needed (mock data, render,
  assert structure)

### PR scope
- Report page, 6 components, evaluate route. No migrations.

---

## M3.5 - MVP UI: Run list

### Page: `app/(eval)/runs/page.tsx`

Server component. Lists all runs with summary data.

**Displays per row:**
- Run ID (link to report)
- Task name
- Status (pending/running/completed/failed)
- Number of contestants
- Winner (if evaluated)
- Total cost
- Created timestamp

**Features:**
- Filter by status (tabs or dropdown)
- Sort by date (newest first, default)
- Pagination (limit/offset)

### Components

```typescript
// components/eval/RunList.tsx
// Table component using existing shadcn/ui Table
// Rows link to /runs/:id

// components/eval/StatusBadge.tsx
// Colored badge: pending=gray, running=blue, completed=green, failed=red
```

### Data fetching

```typescript
// app/(eval)/runs/page.tsx
import { listRuns } from '@/lib/run/engine';

export default async function RunsPage({ searchParams }: { searchParams: Promise<...> }) {
  const params = await searchParams;
  const status = params.status as RunStatus | undefined;
  const db = requireDb();
  const runs = await listRuns(db, { status, limit: 20, offset: ... });
  return <RunList runs={runs} />;
}
```

### E2E test (covers M3.3 + M3.4 + M3.5)

```typescript
// tests/e2e/eval-run.spec.ts (Playwright)

test('create run, view report, see in list', async ({ page }) => {
  // 1. Navigate to /runs/new
  // 2. Fill task form
  // 3. Add two contestants
  // 4. Submit
  // 5. Verify redirect to /runs/:id
  // 6. Verify trace output displayed
  // 7. Navigate to /runs
  // 8. Verify new run appears in list
});
```

### PR scope
- List page, components, E2E test. No migrations.

---

## On-product governance (parallel track)

See `docs/specs/on-product-governance.md` for full detail. Per-PR:
- GitHub issue with acceptance criteria and `spec-attached` label
- PR description with evaluation criteria
- Append to `docs/internal/dev-cost-ledger.yaml`
- Classify any failures caught (gate, review, or manual)

At Phase 3 / MVP gate: write `docs/internal/retros/phase-3-retro.md`.
This is the final retro and should include cumulative metrics across
all three phases. This document becomes the primary portfolio artifact
for the on-product governance claim.

---

## Phase 3 gate checklist (= MVP gate)

- [ ] Every run has cost ledger entries for all traces (sourceType: trace)
- [ ] Every run has cost ledger entries for judge evaluations (sourceType: evaluation)
- [ ] Report summary generation costs appear in cost ledger (sourceType: summary)
- [ ] Cost computed correctly from pricing table
- [ ] Economics totals include trace + evaluation + summary costs
- [ ] Score-per-dollar and score-per-second available (0..1 normalized scores)
- [ ] Can create a run via UI form
- [ ] Can view run report with scores, failures, cost
- [ ] Side-by-side comparison displays in UI
- [ ] Run list shows all runs with summary data
- [ ] E2E test passes: create -> report -> list
- [ ] All existing tests still pass (zero regressions)
- [ ] Gate green: typecheck + lint + test
- [ ] **The MVP sentence is satisfied end-to-end**
