// GET /api/runs/:id/report -- run report assembly (M2.5).
//
// Pure read, never writes. Assembles existing evaluations, scorecards,
// comparison, and failure tags into a composite report. If the run has
// not been evaluated against the specified rubric, returns a report
// shell with needsEvaluation=true.

import { auth } from '@clerk/nextjs/server';
import { requireDb } from '@/db';
import { asRunId, asRubricId } from '@/lib/domain-ids';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';
import { log } from '@/lib/logger';
import { assembleRunReport } from '@/lib/eval/report';
import { getRunIfOwner } from '@/lib/run/runs';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const { id } = await params;
  const url = new URL(req.url);
  const rubricId = url.searchParams.get('rubricId');

  if (!rubricId) {
    return errorResponse('rubricId query param is required', 400);
  }

  try {
    const db = requireDb();
    const runId = asRunId(id);

    const run = await getRunIfOwner(db, runId, userId);
    if (!run) return errorResponse('Run not found', 404);

    const report = await assembleRunReport(db, runId, asRubricId(rubricId));
    if (!report) return errorResponse('Run or rubric not found', 404);

    return Response.json(report, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Forbidden')) return errorResponse(API_ERRORS.FORBIDDEN, 403);
    log.error('GET /api/runs/[id]/report failed', error instanceof Error ? error : new Error(msg));
    return errorResponse(API_ERRORS.INTERNAL, 500);
  }
}
