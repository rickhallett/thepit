// Composite queries for the run model (M1.5).
//
// Joins across tables to produce rich read models.
// Pure persistence layer. No HTTP awareness.

import { eq } from 'drizzle-orm';

import { runs, tasks, contestants, traces } from '@/db/schema';
import type { DbOrTx } from '@/db';
import type { RunId } from '@/lib/domain-ids';
import type { RunWithTraces } from './types';

/**
 * Load a run with its task, contestants, and traces.
 * Each contestant is paired with its trace (or null if no trace exists).
 * Returns null if the run does not exist.
 */
export async function getRunWithTraces(
  db: DbOrTx,
  runId: RunId,
): Promise<RunWithTraces | null> {
  const [run] = await db
    .select()
    .from(runs)
    .where(eq(runs.id, runId))
    .limit(1);

  if (!run) return null;

  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, run.taskId))
    .limit(1);

  if (!task) return null;

  const contestantRows = await db
    .select()
    .from(contestants)
    .where(eq(contestants.runId, runId));

  const traceRows = await db
    .select()
    .from(traces)
    .where(eq(traces.runId, runId));

  // Pair each contestant with its trace
  const contestantsWithTraces = contestantRows.map((c) => ({
    ...c,
    trace: traceRows.find((t) => t.contestantId === c.id) ?? null,
  }));

  return {
    ...run,
    task,
    contestants: contestantsWithTraces,
  };
}
