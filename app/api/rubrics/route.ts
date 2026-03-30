// POST /api/rubrics -- create a rubric with weighted criteria (M2.1).
// GET  /api/rubrics -- list rubrics with optional domain filter.
//
// HTTP layer only. Business logic lives in lib/eval/rubrics.ts.

import { auth } from '@clerk/nextjs/server';
import { withLogging } from '@/lib/api-logging';
import { parseValidBody, errorResponse, API_ERRORS } from '@/lib/api-utils';
import { requireDb } from '@/db';
import { createRubricSchema } from '@/lib/api-schemas';
import { createRubric, listRubrics } from '@/lib/eval/rubrics';

export const runtime = 'nodejs';

async function rawPOST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const parsed = await parseValidBody(req, createRubricSchema);
  if (parsed.error) return parsed.error;

  const db = requireDb();
  const rubric = await createRubric(db, parsed.data);

  return Response.json(rubric, { status: 201 });
}

async function rawGET(req: Request) {
  const url = new URL(req.url);
  const domain = url.searchParams.get('domain');

  const db = requireDb();
  const rubricList = await listRubrics(db, {
    domain: domain ?? undefined,
  });

  return Response.json(rubricList);
}

export const POST = withLogging(rawPOST, 'create-rubric');
export const GET = withLogging(rawGET, 'list-rubrics');
