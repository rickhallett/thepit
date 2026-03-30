// GET/POST /api/runs/:id/failures -- failure tag CRUD (M2.4).
//
// GET: list failure tags for a run.
// POST: add a manual failure tag (auth required).

import { auth } from '@clerk/nextjs/server';
import { requireDb } from '@/db';
import { asRunId, asContestantId } from '@/lib/domain-ids';
import { parseValidBody, errorResponse, API_ERRORS } from '@/lib/api-utils';
import { log } from '@/lib/logger';
import { addFailureTagSchema } from '@/lib/api-schemas';
import { addFailureTag, getFailureTagsForRun } from '@/lib/eval/failure-tags';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const db = requireDb();
    const tags = await getFailureTagsForRun(db, asRunId(id));
    return Response.json(tags, { status: 200 });
  } catch (error) {
    log.error('GET /api/runs/[id]/failures failed', error instanceof Error ? error : new Error(String(error)));
    return errorResponse(API_ERRORS.INTERNAL, 500);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const { id } = await params;

  const parsed = await parseValidBody(req, addFailureTagSchema);
  if (parsed.error) return parsed.error;

  const { contestantId, category, description } = parsed.data;

  try {
    const db = requireDb();
    const tag = await addFailureTag(db, {
      runId: asRunId(id),
      contestantId: asContestantId(contestantId),
      category,
      description: description ?? null,
      source: 'manual',
      evaluationId: null,
    });
    return Response.json(tag, { status: 201 });
  } catch (error) {
    log.error('POST /api/runs/[id]/failures failed', error instanceof Error ? error : new Error(String(error)));
    return errorResponse(API_ERRORS.INTERNAL, 500);
  }
}
