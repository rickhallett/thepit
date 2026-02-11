import { auth } from '@clerk/nextjs/server';
import { eq, ne, sql, desc } from 'drizzle-orm';

import { requireDb } from '@/db';
import { featureRequests, featureRequestVotes, users } from '@/db/schema';
import { checkRateLimit } from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';
import { ensureUserRecord } from '@/lib/users';
import { UNSAFE_PATTERN } from '@/lib/validation';

export const runtime = 'nodejs';

const VALID_CATEGORIES = [
  'agents',
  'arena',
  'presets',
  'research',
  'ui',
  'other',
] as const;

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
    return new Response('Sign in required.', { status: 401 });
  }

  const rateCheck = checkRateLimit(
    { name: 'feature-requests', maxRequests: 10, windowMs: 60 * 60 * 1000 },
    userId,
  );
  if (!rateCheck.success) {
    return new Response('Too many requests. Try again later.', { status: 429 });
  }

  let payload: {
    title?: string;
    description?: string;
    category?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  const title =
    typeof payload.title === 'string' ? payload.title.trim() : '';
  const description =
    typeof payload.description === 'string' ? payload.description.trim() : '';
  const category =
    typeof payload.category === 'string' ? payload.category.trim() : '';

  if (title.length < 5) {
    return new Response('Title must be at least 5 characters.', {
      status: 400,
    });
  }

  if (title.length > 200) {
    return new Response('Title must be 200 characters or fewer.', {
      status: 400,
    });
  }

  if (description.length < 20) {
    return new Response('Description must be at least 20 characters.', {
      status: 400,
    });
  }

  if (description.length > 3000) {
    return new Response('Description must be 3000 characters or fewer.', {
      status: 400,
    });
  }

  if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    return new Response('Invalid category.', { status: 400 });
  }

  if (UNSAFE_PATTERN.test(title)) {
    return new Response('Title must not contain URLs or scripts.', {
      status: 400,
    });
  }

  if (UNSAFE_PATTERN.test(description)) {
    return new Response('Description must not contain URLs or scripts.', {
      status: 400,
    });
  }

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

  return Response.json({ ok: true, id: created.id });
}, 'feature-requests');
