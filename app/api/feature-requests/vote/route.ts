import { auth } from '@clerk/nextjs/server';
import { eq, and, sql } from 'drizzle-orm';

import { requireDb } from '@/db';
import { featureRequestVotes } from '@/db/schema';
import { errorResponse, parseJsonBody, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';
import { log } from '@/lib/logger';

export const runtime = 'nodejs';

/** POST /api/feature-requests/vote — toggle a vote on a feature request. */
export const POST = withLogging(async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const rateCheck = checkRateLimit(
    { name: 'feature-request-votes', maxRequests: 30, windowMs: 60 * 1000 },
    userId,
  );
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const parsed = await parseJsonBody<{ featureRequestId?: number }>(req);
  if (parsed.error) return parsed.error;
  const payload = parsed.data;

  const featureRequestId = payload.featureRequestId;
  if (typeof featureRequestId !== 'number' || !Number.isInteger(featureRequestId)) {
    return errorResponse('Missing or invalid featureRequestId.', 400);
  }

  const db = requireDb();

  // Check if the user already voted.
  const [existing] = await db
    .select({ id: featureRequestVotes.id })
    .from(featureRequestVotes)
    .where(
      and(
        eq(featureRequestVotes.featureRequestId, featureRequestId),
        eq(featureRequestVotes.userId, userId),
      ),
    )
    .limit(1);

  if (existing) {
    // Unvote
    await db
      .delete(featureRequestVotes)
      .where(eq(featureRequestVotes.id, existing.id));
  } else {
    // Vote
    await db
      .insert(featureRequestVotes)
      .values({ featureRequestId, userId })
      .onConflictDoNothing();
  }

  // Get current vote count
  const [result] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(featureRequestVotes)
    .where(eq(featureRequestVotes.featureRequestId, featureRequestId));

  log.info('feature_request.voted', {
    userId,
    featureRequestId,
    voted: !existing,
    voteCount: result.count,
  });

  return Response.json({
    voted: !existing,
    voteCount: result.count,
  });
}, 'feature-request-vote');
