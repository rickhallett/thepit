// POST /api/runs/:id/evaluate -- trigger evaluation of a run (M2.2).
//
// Calls the judge engine to evaluate all contestants against a rubric.
// Synchronous for MVP; evaluation can take 30s+ for multiple contestants.

import { auth } from '@clerk/nextjs/server';
import { requireDb } from '@/db';
import { asRunId, asRubricId } from '@/lib/domain-ids';
import { parseValidBody, errorResponse, API_ERRORS } from '@/lib/api-utils';
import { log } from '@/lib/logger';
import { evaluateRunSchema } from '@/lib/api-schemas';
import { evaluateRun } from '@/lib/eval/judge';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const { id } = await params;

  const parsed = await parseValidBody(req, evaluateRunSchema);
  if (parsed.error) return parsed.error;

  const { rubricId, judgeModel } = parsed.data;

  try {
    const db = requireDb();
    const evaluations = await evaluateRun(db, asRunId(id), {
      model: judgeModel ?? 'claude-sonnet-4-20250514',
      rubricId: asRubricId(rubricId),
    });
    return Response.json(evaluations, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    if (msg.includes('not found')) {
      return errorResponse('Run not found', 404);
    }
    if (msg.includes('expected completed or failed')) {
      return errorResponse('Run is not in a terminal status', 409);
    }

    log.error('POST /api/runs/[id]/evaluate failed', error instanceof Error ? error : new Error(msg));
    return errorResponse(API_ERRORS.INTERNAL, 500);
  }
}
