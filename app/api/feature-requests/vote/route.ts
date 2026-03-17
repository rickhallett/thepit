import { auth } from '@clerk/nextjs/server';

import { errorResponse, parseValidBody, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';
import { featureRequestVoteSchema } from '@/lib/api-schemas';
import { toggleFeatureRequestVote } from '@/lib/feature-requests';

export const runtime = 'nodejs';

/** POST /api/feature-requests/vote - toggle a vote on a feature request. */
export const POST = withLogging(async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const rateCheck = await checkRateLimit(
    { name: 'feature-request-votes', maxRequests: 30, windowMs: 60 * 1000 },
    userId,
  );
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const parsed = await parseValidBody(req, featureRequestVoteSchema);
  if (parsed.error) return parsed.error;
  const { featureRequestId } = parsed.data;

  const result = await toggleFeatureRequestVote(userId, featureRequestId);

  return Response.json(result);
}, 'feature-request-vote');
