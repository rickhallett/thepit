import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { bouts, winnerVotes } from '@/db/schema';
import { errorResponse, parseValidBody, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';
import { withLogging } from '@/lib/api-logging';
import { checkRateLimit } from '@/lib/rate-limit';
import { winnerVoteSchema } from '@/lib/api-schemas';

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

  const db = requireDb();

  const [bout] = await db
    .select({ id: bouts.id })
    .from(bouts)
    .where(eq(bouts.id, boutId))
    .limit(1);

  if (!bout) {
    return errorResponse('Bout not found.', 404);
  }

  await db
    .insert(winnerVotes)
    .values({ boutId, agentId, userId })
    .onConflictDoNothing();

  return Response.json({ ok: true });
}, 'winner-vote');
