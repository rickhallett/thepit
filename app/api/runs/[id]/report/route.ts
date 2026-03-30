// GET /api/runs/:id/report -- run report assembly (M2.5).
//
// Pure read, never writes. Assembles existing evaluations, scorecards,
// comparison, and failure tags into a composite report. If the run has
// not been evaluated against the specified rubric, returns a report
// shell with needsEvaluation=true.

import { requireDb } from '@/db';
import { asRunId, asRubricId } from '@/lib/domain-ids';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';
import { log } from '@/lib/logger';
import { assembleRunReport } from '@/lib/eval/report';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const rubricId = url.searchParams.get('rubricId');

  if (!rubricId) {
    return errorResponse('rubricId query param is required', 400);
  }

  try {
    const db = requireDb();
    const report = await assembleRunReport(db, asRunId(id), asRubricId(rubricId));

    if (!report) {
      return errorResponse('Run or rubric not found', 404);
    }

    return Response.json(report, { status: 200 });
  } catch (error) {
    log.error('GET /api/runs/[id]/report failed', error instanceof Error ? error : new Error(String(error)));
    return errorResponse(API_ERRORS.INTERNAL, 500);
  }
}
