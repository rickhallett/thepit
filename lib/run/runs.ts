// Run CRUD -- domain module for the runs table (M1.2).
//
// Creation and query only. Execution logic is M1.4.
// Pure persistence layer. No HTTP awareness.

import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { runs } from '@/db/schema';
import type { DbOrTx } from '@/db';
import { asRunId, type RunId } from '@/lib/domain-ids';
import type { TaskId } from '@/lib/domain-ids';
import type { Run, RunStatus, ListRunsOptions } from './types';

/** Input for creating a new run. */
export type CreateRunInput = {
  taskId: TaskId;
  ownerId?: string;
  metadata?: Record<string, unknown>;
};

/** Create a new run in pending status. */
export async function createRun(
  db: DbOrTx,
  input: CreateRunInput,
): Promise<Run> {
  const id = asRunId(nanoid());

  const [run] = await db
    .insert(runs)
    .values({
      id,
      taskId: input.taskId,
      ownerId: input.ownerId ?? null,
      metadata: input.metadata ?? null,
    })
    .returning();

  return run;
}

/** Retrieve a single run by ID. Returns null if not found. */
export async function getRun(
  db: DbOrTx,
  id: RunId,
): Promise<Run | null> {
  const [run] = await db
    .select()
    .from(runs)
    .where(eq(runs.id, id))
    .limit(1);

  return run ?? null;
}

/** List runs with optional filters and pagination. */
export async function listRuns(
  db: DbOrTx,
  opts: ListRunsOptions = {},
): Promise<Run[]> {
  const { taskId, status, ownerId, limit = 50, offset = 0 } = opts;

  const conditions = [];
  if (taskId) conditions.push(eq(runs.taskId, taskId));
  if (status) conditions.push(eq(runs.status, status));
  if (ownerId) conditions.push(eq(runs.ownerId, ownerId));

  if (conditions.length > 0) {
    return db
      .select()
      .from(runs)
      .where(and(...conditions))
      .orderBy(desc(runs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  return db
    .select()
    .from(runs)
    .orderBy(desc(runs.createdAt))
    .limit(limit)
    .offset(offset);
}
