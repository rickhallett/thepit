// GET /api/runs/:id -- get a single run with task, contestants, and traces (M1.5).
//
// HTTP layer only. Composite query lives in lib/run/queries.ts.

import { requireDb } from '@/db';
import { asRunId } from '@/lib/domain-ids';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';
import { log } from '@/lib/logger';
import { getRunWithTraces } from '@/lib/run/queries';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const db = requireDb();
    const run = await getRunWithTraces(db, asRunId(id));

    if (!run) {
      return errorResponse('Run not found', 404);
    }

    return Response.json(run);
  } catch (error) {
    log.error('GET /api/runs/[id] failed', error instanceof Error ? error : new Error(String(error)));
    return errorResponse(API_ERRORS.INTERNAL, 500);
  }
}
