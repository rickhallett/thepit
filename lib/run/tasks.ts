// Task CRUD -- domain module for the tasks table (M1.1).
//
// Pure persistence layer. Validates via Zod at the boundary,
// persists via Drizzle. No HTTP awareness.

import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { tasks } from '@/db/schema';
import type { DbOrTx } from '@/db';
import { asTaskId, type TaskId } from '@/lib/domain-ids';
import { createTaskSchema, type CreateTaskBody } from '@/lib/api-schemas';
import type { Task, ListTasksOptions } from './types';

/** Create a new task. Validates input, generates nanoid, persists. */
export async function createTask(
  db: DbOrTx,
  input: CreateTaskBody,
): Promise<Task> {
  const validated = createTaskSchema.parse(input);
  const id = asTaskId(nanoid());

  const [task] = await db
    .insert(tasks)
    .values({
      id,
      name: validated.name,
      description: validated.description ?? null,
      prompt: validated.prompt,
      constraints: validated.constraints ?? null,
      expectedOutputShape: validated.expectedOutputShape ?? null,
      acceptanceCriteria: validated.acceptanceCriteria ?? null,
      domain: validated.domain ?? null,
    })
    .returning();

  return task;
}

/** Retrieve a single task by ID. Returns null if not found. */
export async function getTask(
  db: DbOrTx,
  id: TaskId,
): Promise<Task | null> {
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);

  return task ?? null;
}

/** List tasks with optional domain filter and pagination. */
export async function listTasks(
  db: DbOrTx,
  opts: ListTasksOptions = {},
): Promise<Task[]> {
  const { domain, limit = 50, offset = 0 } = opts;

  if (domain) {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.domain, domain))
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);
  }

  return db
    .select()
    .from(tasks)
    .orderBy(desc(tasks.createdAt))
    .limit(limit)
    .offset(offset);
}
