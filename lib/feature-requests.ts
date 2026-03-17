// Data access layer for feature requests and votes.
// Encapsulates all DB queries so route handlers import only from lib/.

import { eq, ne, and, sql, desc } from 'drizzle-orm';

import { requireDb, type DbOrTx } from '@/db';
import { featureRequests, featureRequestVotes, users } from '@/db/schema';

/** Shape returned by listFeatureRequests for each row. */
export type FeatureRequestView = {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  createdAt: Date;
  displayName: string;
  voteCount: number;
  userVoted: boolean;
};

/**
 * List all non-declined feature requests with vote counts and
 * whether the given user (if any) has voted on each.
 */
export async function listFeatureRequests(userId: string | null): Promise<FeatureRequestView[]> {
  const db = requireDb();

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

  let votedIds: Set<number> = new Set();
  if (userId) {
    const userVotes = await db
      .select({ featureRequestId: featureRequestVotes.featureRequestId })
      .from(featureRequestVotes)
      .where(eq(featureRequestVotes.userId, userId));
    votedIds = new Set(userVotes.map((v) => v.featureRequestId));
  }

  return rows.map((r) => ({
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
}

/**
 * Insert a new feature request. Returns the auto-generated id.
 */
export async function createFeatureRequest(
  userId: string,
  data: { title: string; description: string; category: string },
): Promise<{ id: number }> {
  const db = requireDb();
  const [created] = await db
    .insert(featureRequests)
    .values({
      userId,
      title: data.title,
      description: data.description,
      category: data.category,
    })
    .returning({ id: featureRequests.id });

  if (!created) {
    throw new Error('Feature request insert returned no rows.');
  }
  return { id: created.id };
}

/**
 * Toggle a vote on a feature request. Returns the new voted state
 * and current vote count.
 */
export async function toggleFeatureRequestVote(
  userId: string,
  featureRequestId: number,
): Promise<{ voted: boolean; voteCount: number }> {
  const db = requireDb();

  // Wrap check + toggle + count in a transaction so the returned count
  // is consistent with the action taken (no interleaving with concurrent votes).
  return db.transaction(async (tx) => {
    const [existing] = await tx
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
      await tx
        .delete(featureRequestVotes)
        .where(eq(featureRequestVotes.id, existing.id));
    } else {
      await tx
        .insert(featureRequestVotes)
        .values({ featureRequestId, userId })
        .onConflictDoNothing();
    }

    const [result] = await tx
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(featureRequestVotes)
      .where(eq(featureRequestVotes.featureRequestId, featureRequestId));

    return {
      voted: !existing,
      voteCount: result?.count ?? 0,
    };
  });
}
