// GET /api/rubrics/:id -- retrieve a single rubric (M2.1).
//
// HTTP layer only. Business logic lives in lib/eval/rubrics.ts.

import { requireDb } from '@/db';
import { asRubricId } from '@/lib/domain-ids';
import { errorResponse } from '@/lib/api-utils';
import { log } from '@/lib/logger';
import { getRubric } from '@/lib/eval/rubrics';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const db = requireDb();
    const rubric = await getRubric(db, asRubricId(id));

    if (!rubric) {
      return errorResponse('Rubric not found', 404);
    }

    return Response.json(rubric);
  } catch (error) {
    log.error('GET /api/rubrics/[id] failed', error instanceof Error ? error : new Error(String(error)));
    return errorResponse('Internal server error.', 500);
  }
}
