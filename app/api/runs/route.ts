// POST /api/runs -- create a run with task + contestants (M1.5).
// GET  /api/runs -- list runs with optional filters.
//
// HTTP layer only. Business logic lives in lib/run/.

import { auth } from '@clerk/nextjs/server';
import { withLogging } from '@/lib/api-logging';
import { parseValidBody, errorResponse, API_ERRORS } from '@/lib/api-utils';
import { requireDb } from '@/db';
import { createRunSchema } from '@/lib/api-schemas';
import { createTask } from '@/lib/run/tasks';
import { createRun } from '@/lib/run/runs';
import { addContestant } from '@/lib/run/contestants';
import { listRuns } from '@/lib/run/runs';
import { asTaskId, asRunId, type TaskId } from '@/lib/domain-ids';
import type { RunStatus } from '@/lib/run/types';

export const runtime = 'nodejs';

async function rawPOST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const parsed = await parseValidBody(req, createRunSchema);
  if (parsed.error) return parsed.error;

  const { task: taskInput, contestants: contestantInputs, metadata } = parsed.data;

  const db = requireDb();

  // Resolve task: inline creation or reference
  let taskId: TaskId;
  if ('taskId' in taskInput) {
    taskId = asTaskId(taskInput.taskId);
  } else {
    const task = await createTask(db, taskInput);
    taskId = asTaskId(task.id);
  }

  // Create run
  const run = await createRun(db, { taskId, ownerId: userId, metadata });

  // Add contestants
  const contestantResults = [];
  for (const input of contestantInputs) {
    const contestant = await addContestant(db, asRunId(run.id), input);
    contestantResults.push(contestant);
  }

  return Response.json(
    { ...run, contestants: contestantResults },
    { status: 201 },
  );
}

async function rawGET(req: Request) {
  const { userId } = await auth();
  const url = new URL(req.url);

  const status = url.searchParams.get('status') as RunStatus | null;
  const taskId = url.searchParams.get('taskId');
  const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

  const db = requireDb();
  const runs = await listRuns(db, {
    status: status ?? undefined,
    taskId: taskId ?? undefined,
    ownerId: userId ?? undefined,
    limit: Math.min(limit, 100),
    offset: Math.max(offset, 0),
  });

  return Response.json(runs);
}

export const POST = withLogging(rawPOST, 'create-run');
export const GET = withLogging(rawGET, 'list-runs');
