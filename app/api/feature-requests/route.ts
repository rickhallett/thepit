import { auth } from '@clerk/nextjs/server';
import { eq, ne, sql, desc } from 'drizzle-orm';

import { requireDb } from '@/db';
import { featureRequests, featureRequestVotes, users } from '@/db/schema';
import { errorResponse, parseValidBody, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';
import { ensureUserRecord } from '@/lib/users';
import { featureRequestSchema } from '@/lib/api-schemas';

export const runtime = 'nodejs';

/** GET /api/feature-requests — public list of non-declined requests with vote counts. */
export const GET = withLogging(async function GET() {
  const db = requireDb();
  const { userId } = await auth();

  const voteCount = sql<number>`(
    select count(*)::int from feature_request_votes
    where feature_request_votes.feature_request_id = ${featureRequests.id}
  )`.as('vote_count');

  const rows = await db
    .select({
      id: featureRequests.id,
      title: featureRequests.title,
      description: featureRequests.description,
      category: featureRequests.category,
      status: featureRequests.status,
      createdAt: featureRequests.createdAt,
      userId: featureRequests.userId,
      displayName: users.displayName,
      voteCount,
    })
    .from(featureRequests)
    .leftJoin(users, eq(featureRequests.userId, users.id))
    .where(ne(featureRequests.status, 'declined'))
    .orderBy(desc(voteCount), desc(featureRequests.createdAt));

  // If the caller is authenticated, check which requests they've voted on.
  let votedIds: Set<number> = new Set();
  if (userId) {
    const userVotes = await db
      .select({ featureRequestId: featureRequestVotes.featureRequestId })
      .from(featureRequestVotes)
      .where(eq(featureRequestVotes.userId, userId));
    votedIds = new Set(userVotes.map((v) => v.featureRequestId));
  }

  const requests = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    status: r.status,
    createdAt: r.createdAt,
    displayName: r.displayName ?? 'Anonymous',
    voteCount: r.voteCount,
    userVoted: votedIds.has(r.id),
  }));

  return Response.json({ requests });
}, 'feature-requests-list');

/** POST /api/feature-requests — auth-required, rate-limited submission. */
export const POST = withLogging(async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const rateCheck = checkRateLimit(
    { name: 'feature-requests', maxRequests: 10, windowMs: 60 * 60 * 1000 },
    userId,
  );
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const parsed = await parseValidBody(req, featureRequestSchema);
  if (parsed.error) return parsed.error;
  const { title, description, category } = parsed.data;

  await ensureUserRecord(userId);

  const db = requireDb();
  const [created] = await db
    .insert(featureRequests)
    .values({
      userId,
      title,
      description,
      category,
    })
    .returning({ id: featureRequests.id });

  return Response.json({ ok: true, id: created!.id });
}, 'feature-requests');
