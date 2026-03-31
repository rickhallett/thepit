// GET /api/runs/:id/economics -- score/cost tradeoff data (M3.2).
//
// HTTP layer only. Aggregation lives in lib/run/economics.ts.

import { auth } from '@clerk/nextjs/server';
import { requireDb } from '@/db';
import { asRunId } from '@/lib/domain-ids';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';
import { log } from '@/lib/logger';
import { getRunEconomics } from '@/lib/run/economics';
import { getRunIfOwner } from '@/lib/run/runs';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const { id } = await params;

  try {
    const db = requireDb();
    const runId = asRunId(id);

    const run = await getRunIfOwner(db, runId, userId);
    if (!run) return errorResponse('Run not found', 404);

    const economics = await getRunEconomics(db, runId);
    if (!economics) return errorResponse('Run not found', 404);

    return Response.json(economics);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Forbidden')) return errorResponse(API_ERRORS.FORBIDDEN, 403);
    log.error('GET /api/runs/[id]/economics failed', error instanceof Error ? error : new Error(msg));
    return errorResponse(API_ERRORS.INTERNAL, 500);
  }
}
