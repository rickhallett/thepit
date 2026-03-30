// Run execution engine (M1.4).
//
// Orchestrates model calls for each contestant in a run,
// captures full traces, and manages run lifecycle.
// Sequential execution -- parallel is post-MVP.

import { eq, and, lt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { generateText } from 'ai';

import { runs, contestants, traces, tasks } from '@/db/schema';
import type { DbOrTx } from '@/db';
import { getModel } from '@/lib/ai';
import { asTraceId } from '@/lib/domain-ids';
import type { RunId } from '@/lib/domain-ids';
import type {
  Run, Task, Contestant, Trace, RunWithTraces, TraceMessage,
} from './types';

const STALE_RUN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Message building
// ---------------------------------------------------------------------------

/** Build the messages array from task + contestant config. */
export function buildMessages(
  task: Task,
  contestant: Contestant,
): TraceMessage[] {
  const messages: TraceMessage[] = [];

  if (contestant.systemPrompt) {
    messages.push({ role: 'system', content: contestant.systemPrompt });
  }

  // Inject context bundle documents as user context
  const docs = contestant.contextBundle?.documents;
  if (docs && docs.length > 0) {
    const contextBlock = docs
      .map((d) => `--- ${d.label} ---\n${d.content}`)
      .join('\n\n');
    messages.push({ role: 'user', content: contextBlock });
  }

  // Task prompt with constraints and acceptance criteria
  let taskContent = task.prompt;
  if (task.constraints && task.constraints.length > 0) {
    taskContent += '\n\nConstraints:\n' +
      task.constraints.map((c) => `- ${c}`).join('\n');
  }
  if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
    taskContent += '\n\nAcceptance criteria:\n' +
      task.acceptanceCriteria.map((c) => `- ${c}`).join('\n');
  }
  messages.push({ role: 'user', content: taskContent });

  return messages;
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

/**
 * Execute a run: call each contestant's model, capture traces,
 * update run status. Returns the completed run with traces.
 *
 * Contestants are executed sequentially for deterministic ordering
 * and simpler error handling. Parallel execution is post-MVP.
 */
export async function executeRun(
  db: DbOrTx,
  runId: RunId,
): Promise<RunWithTraces> {
  // 1. Load run, validate status is 'pending'
  const [run] = await db
    .select()
    .from(runs)
    .where(eq(runs.id, runId))
    .limit(1);

  if (!run) {
    throw new Error(`Run not found: ${runId}`);
  }
  if (run.status !== 'pending') {
    throw new Error(`Run ${runId} is ${run.status}, expected pending`);
  }

  // 2. Set status to 'running'
  const now = new Date();
  await db
    .update(runs)
    .set({ status: 'running', startedAt: now, updatedAt: now })
    .where(eq(runs.id, runId));

  // 3. Load task and contestants
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, run.taskId))
    .limit(1);

  if (!task) {
    throw new Error(`Task not found: ${run.taskId}`);
  }

  const contestantRows = await db
    .select()
    .from(contestants)
    .where(eq(contestants.runId, runId));

  // 4. Execute each contestant
  const traceResults: (Contestant & { trace: Trace | null })[] = [];
  let failures = 0;

  for (const contestant of contestantRows) {
    const messages = buildMessages(task, contestant);
    const traceId = asTraceId(nanoid());
    const startedAt = new Date();

    try {
      const model = getModel(contestant.model);
      const start = performance.now();
      const result = await generateText({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: contestant.temperature ?? undefined,
        maxOutputTokens: contestant.maxTokens ?? undefined,
      });
      const latencyMs = Math.round(performance.now() - start);
      const completedAt = new Date();

      const [trace] = await db
        .insert(traces)
        .values({
          id: traceId,
          runId,
          contestantId: contestant.id,
          requestMessages: messages,
          requestModel: contestant.model,
          requestTemperature: contestant.temperature,
          responseContent: result.text,
          responseFinishReason: result.finishReason ?? null,
          inputTokens: result.usage?.inputTokens ?? null,
          outputTokens: result.usage?.outputTokens ?? null,
          totalTokens: result.usage
            ? (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0)
            : null,
          latencyMs,
          status: 'success',
          error: null,
          startedAt,
          completedAt,
        })
        .returning();

      traceResults.push({ ...contestant, trace: trace ?? null });
    } catch (err) {
      failures++;
      const completedAt = new Date();
      const errorMsg = err instanceof Error ? err.message : String(err);

      const [trace] = await db
        .insert(traces)
        .values({
          id: traceId,
          runId,
          contestantId: contestant.id,
          requestMessages: messages,
          requestModel: contestant.model,
          requestTemperature: contestant.temperature,
          responseContent: null,
          responseFinishReason: null,
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
          latencyMs: null,
          status: 'error',
          error: errorMsg,
          startedAt,
          completedAt,
        })
        .returning();

      traceResults.push({ ...contestant, trace: trace ?? null });
    }
  }

  // 5. Set final status
  const completedAt = new Date();
  const allFailed = failures === contestantRows.length && contestantRows.length > 0;
  const finalStatus = allFailed ? 'failed' : 'completed';
  const errorSummary = failures > 0
    ? `${failures}/${contestantRows.length} contestants failed`
    : null;

  await db
    .update(runs)
    .set({
      status: finalStatus,
      completedAt,
      error: errorSummary,
      updatedAt: completedAt,
    })
    .where(eq(runs.id, runId));

  // 6. Return run with traces
  const updatedRun: Run = {
    ...run,
    status: finalStatus,
    startedAt: now,
    completedAt,
    error: errorSummary,
    updatedAt: completedAt,
  };

  return {
    ...updatedRun,
    task,
    contestants: traceResults,
  };
}

// ---------------------------------------------------------------------------
// Zombie sweep
// ---------------------------------------------------------------------------

/**
 * Find runs stuck in 'running' past the timeout and mark them failed.
 * Returns the number of runs swept. Call on startup or via admin endpoint.
 */
export async function sweepStaleRuns(
  db: DbOrTx,
  timeoutMs: number = STALE_RUN_TIMEOUT_MS,
): Promise<number> {
  const cutoff = new Date(Date.now() - timeoutMs);
  const now = new Date();

  const staleRuns = await db
    .select()
    .from(runs)
    .where(and(
      eq(runs.status, 'running'),
      lt(runs.startedAt, cutoff),
    ));

  if (staleRuns.length === 0) return 0;

  for (const run of staleRuns) {
    await db
      .update(runs)
      .set({
        status: 'failed',
        error: 'Execution timed out or process died',
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(runs.id, run.id));
  }

  return staleRuns.length;
}
