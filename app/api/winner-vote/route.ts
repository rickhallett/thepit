import { auth } from '@clerk/nextjs/server';

import { errorResponse, parseValidBody, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';
import { withLogging } from '@/lib/api-logging';
import { checkRateLimit } from '@/lib/rate-limit';
import { winnerVoteSchema } from '@/lib/api-schemas';
import { castWinnerVote } from '@/lib/winner-votes';

export const runtime = 'nodejs';

const RATE_LIMIT = { name: 'winner-vote', maxRequests: 30, windowMs: 60_000 };

export const POST = withLogging(async function POST(req: Request) {
  const parsed = await parseValidBody(req, winnerVoteSchema);
  if (parsed.error) return parsed.error;
  const { boutId, agentId } = parsed.data;

  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const rateCheck = checkRateLimit(RATE_LIMIT, userId);
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const result = await castWinnerVote({ boutId, agentId, userId });

  if (!result.ok) {
    return errorResponse(result.error, result.status);
  }

  return Response.json({ ok: true });
}, 'winner-vote');
