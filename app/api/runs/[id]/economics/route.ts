// GET /api/runs/:id/economics -- score/cost tradeoff data (M3.2).
//
// HTTP layer only. Aggregation lives in lib/run/economics.ts.

import { requireDb } from '@/db';
import { asRunId } from '@/lib/domain-ids';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';
import { log } from '@/lib/logger';
import { getRunEconomics } from '@/lib/run/economics';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const db = requireDb();
    const economics = await getRunEconomics(db, asRunId(id));

    if (!economics) {
      return errorResponse('Run not found', 404);
    }

    return Response.json(economics);
  } catch (error) {
    log.error('GET /api/runs/[id]/economics failed', error instanceof Error ? error : new Error(String(error)));
    return errorResponse(API_ERRORS.INTERNAL, 500);
  }
}
