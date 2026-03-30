// POST /api/runs/:id/execute -- execute a pending run (M1.5).
//
// Separated from creation to avoid timeout on long model calls.
// Sequential contestant execution can take 30s-2min+.
// For MVP this is synchronous; post-MVP converts to async job.

import { auth } from '@clerk/nextjs/server';
import { requireDb } from '@/db';
import { asRunId } from '@/lib/domain-ids';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';
import { log } from '@/lib/logger';
import { executeRun } from '@/lib/run/engine';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(
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
    const result = await executeRun(db, asRunId(id));
    return Response.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    // Expected errors from executeRun validation
    if (msg.includes('not found')) {
      return errorResponse('Run not found', 404);
    }
    if (msg.includes('expected pending')) {
      return errorResponse(`Run is not in pending status`, 409);
    }

    log.error('POST /api/runs/[id]/execute failed', error instanceof Error ? error : new Error(msg));
    return errorResponse(API_ERRORS.INTERNAL, 500);
  }
}
