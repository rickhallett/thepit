// Admin endpoint to sweep stuck bouts.
//
// Finds bouts stuck in 'running' status beyond the configured threshold,
// marks them as 'error', and refunds preauthorized credits. Designed to
// be called by a cron job or manually via admin tooling.

import { requireAdmin } from '@/lib/admin-auth';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';
import { withLogging } from '@/lib/api-logging';
import { sweepStuckBouts } from '@/lib/bout-sweep';

export const runtime = 'nodejs';

async function rawPOST(req: Request) {
  try {
    requireAdmin(req);
  } catch {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const result = await sweepStuckBouts();

  return Response.json({
    swept: result.swept,
    refunded: result.refunded,
    details: result.details.map((d) => ({
      boutId: d.boutId,
      ownerId: d.ownerId,
      createdAt: d.createdAt.toISOString(),
      refundedMicro: d.refundedMicro,
    })),
  });
}

export const POST = withLogging(rawPOST, 'sweep-bouts');
