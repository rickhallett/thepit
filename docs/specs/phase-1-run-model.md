---
title: "Phase 1 - Run Model and Execution"
category: spec
status: draft
created: 2026-03-27
phase: 1
milestones: M1.1, M1.2, M1.3, M1.4, M1.5
depends_on: none
---

# Phase 1 - Run Model and Execution

## Objective

A structured run can be defined, executed against two or more agent
configurations, and persisted with full traces. This phase creates
the foundational data model that all subsequent phases operate on.

## Design decisions

1. **Coexistence, not migration.** The new run model sits alongside
   the existing bout model. Bouts continue to work unchanged. No
   foreign keys between runs and bouts. They are separate concerns
   that may converge later.

2. **Same conventions.** Nanoid PKs (varchar 21) via `domain-ids.ts`
   branded types. Drizzle schema in `db/schema.ts`. Zod validation
   in `lib/api-schemas.ts`. Named exports, no classes.

3. **Runs are immutable after completion.** A run's status progresses
   forward only: pending -> running -> completed | failed. No edits
   to completed runs.

4. **Traces are append-only.** Each model call produces a trace
   record. Traces are never updated or deleted.

5. **Zombie run recovery.** A run stuck in `running` (process died
   mid-execution) can be moved to `failed` by a sweep. The sweep
   is not an automated background job for MVP - it is a manual
   admin action or startup check. A run is considered stale if it
   has been in `running` for longer than `STALE_RUN_TIMEOUT_MS`
   (default: 5 minutes). Stale runs are set to `failed` with
   `error: 'Execution timed out or process died'`. Any traces
   written before the failure are preserved. This is the only
   sanctioned backwards-compatible status transition: running ->
   failed via sweep. It is not a general-purpose "retry" - the
   run is marked dead, and the user creates a new run.

---

## Module map

```
db/schema.ts              Add: tasks, runs, contestants, traces tables
lib/domain-ids.ts         Add: TaskId, RunId, ContestantId, TraceId branded types
lib/run/                  New directory (barrel: lib/run/index.ts)
  lib/run/types.ts        Shared types and enums
  lib/run/tasks.ts        Task CRUD
  lib/run/contestants.ts  Contestant CRUD
  lib/run/engine.ts       Run execution (orchestration + model calls)
  lib/run/traces.ts       Trace persistence and retrieval
  lib/run/queries.ts      Composite queries (run with traces, comparisons)
lib/api-schemas.ts        Add: Zod schemas for run endpoints
app/api/runs/             New route directory
  app/api/runs/route.ts           POST (create), GET (list)
  app/api/runs/[id]/route.ts      GET (single run with traces)
  app/api/runs/[id]/execute/route.ts  POST (execute a pending run)
tests/unit/run/           New test directory
tests/api/run/            New test directory
```

### Interface boundaries

- `lib/run/` is the domain module. It knows about the database and
  the AI SDK. It does NOT know about HTTP requests or responses.
- `app/api/runs/` is the HTTP layer. It validates requests (Zod),
  calls `lib/run/` functions, and returns responses. It does NOT
  contain business logic.
- `lib/run/engine.ts` depends on `lib/ai.ts` for model resolution
  (existing `getModel()` function). It does NOT duplicate provider
  config.
- `lib/run/traces.ts` is a pure persistence module. The engine
  writes traces; queries read them. No circular dependency.

---

## M1.1 - Run schema

### Table: `tasks`

```typescript
// db/schema.ts addition

export const tasks = pgTable('tasks', {
  id: varchar('id', { length: 21 }).primaryKey(),    // nanoid, TaskId
  name: varchar('name', { length: 256 }).notNull(),
  description: text('description'),                   // human-readable purpose
  prompt: text('prompt').notNull(),                   // the actual task prompt
  constraints: jsonb('constraints').$type<string[]>(), // rules the contestant must follow
  expectedOutputShape: varchar('expected_output_shape', { length: 64 }),  // 'text' | 'json' | 'code'
  acceptanceCriteria: jsonb('acceptance_criteria').$type<string[]>(),     // what "good" looks like
  domain: varchar('domain', { length: 64 }),          // e.g. 'job-application', 'evaluation'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Branded type

```typescript
// lib/domain-ids.ts addition
export type TaskId = string & Brand<'TaskId'>;
export function toTaskId(id: string): TaskId { return id as TaskId; }
```

### Zod schema

```typescript
// lib/api-schemas.ts addition
export const createTaskSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  prompt: z.string().min(1),
  constraints: z.array(z.string()).optional(),
  expectedOutputShape: z.enum(['text', 'json', 'code']).optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  domain: z.string().max(64).optional(),
});
```

### Domain module

```typescript
// lib/run/tasks.ts
export async function createTask(
  db: DbOrTx,
  input: CreateTaskInput,
): Promise<Task> { ... }

export async function getTask(
  db: DbOrTx,
  id: TaskId,
): Promise<Task | null> { ... }

export async function listTasks(
  db: DbOrTx,
  opts?: { domain?: string; limit?: number; offset?: number },
): Promise<Task[]> { ... }
```

### Tests

- tests/unit/run/tasks.test.ts
  - createTask persists and returns with id
  - createTask validates required fields
  - getTask returns null for missing id
  - listTasks filters by domain
  - listTasks respects limit/offset

### PR scope
- 1 migration, 1 branded type, 1 Zod schema, 1 domain module, tests
- No API routes yet (M1.5)

---

## M1.2 - Task definition schema

This was folded into M1.1. The task table IS the task definition.
M1.2 is now **run schema**.

### Table: `runs`

```typescript
export const runStatus = pgEnum('run_status', [
  'pending', 'running', 'completed', 'failed',
]);

export const runs = pgTable('runs', {
  id: varchar('id', { length: 21 }).primaryKey(),     // nanoid, RunId
  taskId: varchar('task_id', { length: 21 })
    .notNull()
    .references(() => tasks.id),
  status: runStatus('status').default('pending').notNull(),
  ownerId: varchar('owner_id', { length: 128 })
    .references(() => users.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  error: text('error'),                                // failure reason if status=failed
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('runs_task_id_idx').on(table.taskId),
  index('runs_owner_id_idx').on(table.ownerId),
  index('runs_status_created_idx').on(table.status, table.createdAt),
]);
```

### Branded type

```typescript
export type RunId = string & Brand<'RunId'>;
export function toRunId(id: string): RunId { return id as RunId; }
```

### Domain module

```typescript
// lib/run/engine.ts (creation only at this milestone; execution in M1.4)
export async function createRun(
  db: DbOrTx,
  input: { taskId: TaskId; ownerId?: string; metadata?: Record<string, unknown> },
): Promise<Run> { ... }

export async function getRun(
  db: DbOrTx,
  id: RunId,
): Promise<Run | null> { ... }

export async function listRuns(
  db: DbOrTx,
  opts?: { taskId?: TaskId; status?: RunStatus; limit?: number; offset?: number },
): Promise<Run[]> { ... }
```

### Tests

- tests/unit/run/engine.test.ts (creation subset)
  - createRun persists with pending status
  - createRun rejects missing taskId
  - getRun returns null for missing id
  - listRuns filters by status and taskId

### PR scope
- 1 migration, 1 enum, 1 branded type, domain functions, tests

---

## M1.3 - Contestant configuration

### Table: `contestants`

```typescript
export const contestants = pgTable('contestants', {
  id: varchar('id', { length: 21 }).primaryKey(),     // nanoid, ContestantId
  runId: varchar('run_id', { length: 21 })
    .notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 128 }).notNull(), // human-readable name, e.g. "GPT-4o baseline"
  model: varchar('model', { length: 128 }).notNull(),  // model identifier (matches lib/models.ts)
  provider: varchar('provider', { length: 64 }),        // openai | anthropic | google | xai
  systemPrompt: text('system_prompt'),
  temperature: real('temperature'),
  maxTokens: integer('max_tokens'),
  toolAccess: jsonb('tool_access').$type<string[]>(),   // allowed tool names (future use)
  contextBundle: jsonb('context_bundle').$type<ContextBundleInput>(), // inline context for now
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('contestants_run_id_idx').on(table.runId),
]);
```

### Context bundle (inline for MVP)

```typescript
// lib/run/types.ts
export type ContextBundleInput = {
  documents?: Array<{
    label: string;
    content: string;
    source?: string;       // provenance hint
  }>;
};
```

This is deliberately simple. Phase 4 (post-MVP context layer) will
introduce proper context bundle tables with provenance, retrieval,
and quarantine. For now, inline JSONB is sufficient and avoids
premature abstraction.

### Branded type

```typescript
export type ContestantId = string & Brand<'ContestantId'>;
export function toContestantId(id: string): ContestantId { return id as ContestantId; }
```

### Domain module

```typescript
// lib/run/contestants.ts
export async function addContestant(
  db: DbOrTx,
  input: AddContestantInput,
): Promise<Contestant> { ... }

export async function getContestantsForRun(
  db: DbOrTx,
  runId: RunId,
): Promise<Contestant[]> { ... }
```

### Validation

```typescript
// lib/api-schemas.ts
export const addContestantSchema = z.object({
  label: z.string().min(1).max(128),
  model: z.string().min(1).max(128),
  provider: z.enum(['openai', 'anthropic', 'google', 'xai']).optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  toolAccess: z.array(z.string()).optional(),
  contextBundle: z.object({
    documents: z.array(z.object({
      label: z.string(),
      content: z.string(),
      source: z.string().optional(),
    })).optional(),
  }).optional(),
});
```

### Tests

- tests/unit/run/contestants.test.ts
  - addContestant persists with runId
  - addContestant validates model field
  - getContestantsForRun returns empty array for no contestants
  - getContestantsForRun returns all contestants for a run
  - cascade: deleting run deletes contestants

### PR scope
- 1 migration, 1 branded type, 1 type, 1 Zod schema, domain module, tests

---

## M1.4 - Execution engine

This is the most complex milestone in Phase 1. The engine:
1. Loads the task and contestants for a run
2. Calls each contestant's model with the task prompt + context
3. Captures the full trace (request, response, timing, tokens)
4. Updates run status through the lifecycle

### Table: `traces`

```typescript
export const traces = pgTable('traces', {
  id: varchar('id', { length: 21 }).primaryKey(),      // nanoid, TraceId
  runId: varchar('run_id', { length: 21 })
    .notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  contestantId: varchar('contestant_id', { length: 21 })
    .notNull()
    .references(() => contestants.id, { onDelete: 'cascade' }),
  // Request
  requestMessages: jsonb('request_messages').$type<TraceMessage[]>().notNull(),
  requestModel: varchar('request_model', { length: 128 }).notNull(),
  requestTemperature: real('request_temperature'),
  // Response
  responseContent: text('response_content'),
  responseFinishReason: varchar('response_finish_reason', { length: 32 }),
  // Metrics
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  totalTokens: integer('total_tokens'),
  latencyMs: integer('latency_ms'),
  // Status
  status: varchar('status', { length: 16 }).notNull(), // 'success' | 'error'
  error: text('error'),
  // Timestamps
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('traces_run_id_idx').on(table.runId),
  index('traces_contestant_id_idx').on(table.contestantId),
]);

// lib/run/types.ts
export type TraceMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};
```

### Branded type

```typescript
export type TraceId = string & Brand<'TraceId'>;
export function toTraceId(id: string): TraceId { return id as TraceId; }
```

### Engine interface

```typescript
// lib/run/engine.ts (execution additions)

/**
 * Execute a run: call each contestant's model, capture traces,
 * update run status. Returns the completed run with traces.
 *
 * Contestants are executed sequentially (not parallel) for
 * deterministic ordering and simpler error handling. Parallel
 * execution is a post-MVP optimisation.
 */
export async function executeRun(
  db: DbOrTx,
  runId: RunId,
): Promise<RunWithTraces> {
  // 1. Load run, validate status is 'pending'
  // 2. Set status to 'running', set startedAt
  // 3. Load task and contestants
  // 4. For each contestant:
  //    a. Build messages array (system prompt + task prompt + context)
  //    b. Call model via getModel() from lib/ai.ts
  //    c. Capture response, timing, token usage
  //    d. Persist trace record
  //    e. On error: persist error trace, continue to next contestant
  // 5. Set status to 'completed' (or 'failed' if all contestants errored)
  // 6. Set completedAt
  // 7. Return run with traces
}
```

### Message building

```typescript
// lib/run/engine.ts (internal)

function buildMessages(
  task: Task,
  contestant: Contestant,
): TraceMessage[] {
  const messages: TraceMessage[] = [];

  if (contestant.systemPrompt) {
    messages.push({ role: 'system', content: contestant.systemPrompt });
  }

  // Inject context bundle documents as user context
  if (contestant.contextBundle?.documents?.length) {
    const contextBlock = contestant.contextBundle.documents
      .map(d => `--- ${d.label} ---\n${d.content}`)
      .join('\n\n');
    messages.push({ role: 'user', content: contextBlock });
  }

  // Task prompt
  let taskContent = task.prompt;
  if (task.constraints?.length) {
    taskContent += '\n\nConstraints:\n' +
      task.constraints.map(c => `- ${c}`).join('\n');
  }
  if (task.acceptanceCriteria?.length) {
    taskContent += '\n\nAcceptance criteria:\n' +
      task.acceptanceCriteria.map(c => `- ${c}`).join('\n');
  }
  messages.push({ role: 'user', content: taskContent });

  return messages;
}
```

### Integration with lib/ai.ts

The existing `getModel()` function resolves a model identifier to a
provider-specific client. The engine calls it directly:

```typescript
import { getModel } from '@/lib/ai';
import { generateText } from 'ai';  // Vercel AI SDK

const model = getModel(contestant.model);
const start = performance.now();
const result = await generateText({ model, messages });
const latencyMs = Math.round(performance.now() - start);
```

Token usage comes from `result.usage` (Vercel AI SDK standard).

### Error handling

- If a single contestant fails, the trace records the error and
  the run continues to the next contestant.
- If ALL contestants fail, the run status is set to 'failed'.
- If at least one contestant succeeds, the run status is 'completed'.
- The run's `error` field captures a summary if any failures occurred.

### Zombie sweep

```typescript
// lib/run/engine.ts

const STALE_RUN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Find runs stuck in 'running' past the timeout and mark them failed.
 * Returns the number of runs swept. Call on startup or via admin endpoint.
 */
export async function sweepStaleRuns(
  db: DbOrTx,
  timeoutMs: number = STALE_RUN_TIMEOUT_MS,
): Promise<number> { ... }
```

### Tests

- tests/unit/run/engine.test.ts (execution subset)
  - executeRun transitions pending -> running -> completed
  - executeRun creates one trace per contestant
  - executeRun captures token counts from AI SDK response
  - executeRun captures latency
  - executeRun handles single contestant failure gracefully
  - executeRun marks run as failed when all contestants error
  - executeRun rejects non-pending runs
  - sweepStaleRuns marks old running runs as failed
  - sweepStaleRuns preserves existing traces on swept runs
  - sweepStaleRuns ignores runs within timeout window
  - buildMessages includes system prompt when present
  - buildMessages includes context bundle documents
  - buildMessages includes constraints and acceptance criteria

Mock strategy: mock `getModel()` and `generateText()` via
vi.hoisted() + vi.mock(), matching existing bout-engine test patterns.

### PR scope
- 1 migration (traces table), 1 branded type, engine execution logic,
  message builder, tests
- This is the largest PR in Phase 1. Target: ~60-90 agent-minutes.

---

## M1.5 - Run API

HTTP layer only. All business logic lives in lib/run/.

### Routes

```typescript
// app/api/runs/route.ts

// POST /api/runs - create a run (does not execute)
// Request body:
// {
//   task: CreateTaskInput | { taskId: string },  // inline or reference
//   contestants: AddContestantInput[],            // minimum 2
//   metadata?: Record<string, unknown>,
// }
// Response: Run with status 'pending' (201)

export const POST = withLogging(async function POST(req: Request) {
  const { userId } = await auth();
  const body = await parseValidBody(req, createRunSchema);
  if (body instanceof Response) return body;

  const db = requireDb();
  // ... create task (or resolve taskId), create run, add contestants
  // Run is created with status 'pending'. NOT executed inline.
  return Response.json(result, { status: 201 });
}, 'create-run');

// POST /api/runs/:id/execute - execute a pending run
// Separated from creation to avoid timeout on long model calls.
// Sequential contestant execution with 2+ model calls can take
// 30s-2min+. Combining create+execute in one request creates
// timeout and retry hazards.
//
// For MVP: this is still synchronous (request blocks until done).
// The route sets maxDuration high enough for the expected workload.
// Post-MVP: convert to async job with polling or SSE for status.
//
// Response: RunWithTraces (200)

export const POST = withLogging(async function POST(req, { params }) {
  const { id } = await params;
  const db = requireDb();
  const result = await executeRun(db, toRunId(id));
  return Response.json(result);
}, 'execute-run');

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes for sequential model calls

// GET /api/runs - list runs
// Query params: ?status=completed&taskId=xxx&limit=20&offset=0
// Response: Run[] (200)

export const GET = withLogging(async function GET(req: Request) {
  const { userId } = await auth();
  const url = new URL(req.url);
  // ... parse query params, call listRuns
  return Response.json(runs);
}, 'list-runs');
```

```typescript
// app/api/runs/[id]/route.ts

// GET /api/runs/:id - get run with traces
// Response: RunWithTraces (200) or 404

export const GET = withLogging(async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = requireDb();
  const run = await getRunWithTraces(db, toRunId(id));
  if (!run) return errorResponse('Run not found', 404);
  return Response.json(run);
}, 'get-run');
```

### Composite Zod schema

```typescript
// lib/api-schemas.ts
export const createRunSchema = z.object({
  task: z.union([
    createTaskSchema,                           // inline task creation
    z.object({ taskId: z.string().length(21) }),  // reference existing
  ]),
  contestants: z.array(addContestantSchema).min(2),
  metadata: z.record(z.unknown()).optional(),
});
```

### Composite query

```typescript
// lib/run/queries.ts

export type RunWithTraces = Run & {
  task: Task;
  contestants: (Contestant & { trace: Trace | null })[];
};

export async function getRunWithTraces(
  db: DbOrTx,
  runId: RunId,
): Promise<RunWithTraces | null> { ... }
```

### Tests

- tests/api/run/runs.test.ts
  - POST /api/runs creates run with pending status (201)
  - POST /api/runs validates minimum 2 contestants (400)
  - POST /api/runs rejects empty task prompt (400)
  - POST /api/runs requires auth (401)
  - POST /api/runs/:id/execute transitions pending to completed (200)
  - POST /api/runs/:id/execute rejects non-pending run (409)
  - POST /api/runs/:id/execute returns traces with token counts (200)
  - GET /api/runs returns list (200)
  - GET /api/runs filters by status
  - GET /api/runs/:id returns run with traces (200)
  - GET /api/runs/:id returns 404 for missing run

Follow existing pattern: mock db, mock auth, call route handler
directly, assert on Response status and body.

### PR scope
- 2 route files, Zod schemas, composite query module, tests

---

## On-product governance (parallel track)

See `docs/specs/on-product-governance.md` for full detail. Per-PR:
- GitHub issue with acceptance criteria and `spec-attached` label
- PR description with evaluation criteria
- Append to `docs/internal/dev-cost-ledger.yaml`
- Classify any failures caught (gate, review, or manual)

At Phase 1 gate: write `docs/internal/retros/phase-1-retro.md`.

---

## Phase 1 gate checklist

Before proceeding to Phase 2, verify:

- [ ] Can create a task via API
- [ ] Can create a run with 2+ contestants via API
- [ ] Run executes and produces traces for each contestant
- [ ] Traces contain: model, messages, response, tokens, latency
- [ ] Run status lifecycle: pending -> running -> completed/failed
- [ ] Can retrieve run with full traces via GET /api/runs/:id
- [ ] Can list runs with filtering via GET /api/runs
- [ ] All existing tests still pass (zero regressions)
- [ ] New tests cover run lifecycle, edge cases, error handling
- [ ] Gate green: typecheck + lint + test
