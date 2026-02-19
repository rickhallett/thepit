// Per-turn reaction counts (heart/fire) for bout turns.
// Reactions are crowd signals used for research data and social proof.

import { eq, sql, desc } from 'drizzle-orm';

import { requireDb } from '@/db';
import { reactions } from '@/db/schema';

export type ReactionCountMap = Record<number, { heart: number; fire: number }>;

export async function getReactionCounts(boutId: string) {
  const db = requireDb();
  const rows = await db
    .select({
      turnIndex: reactions.turnIndex,
      reactionType: reactions.reactionType,
      count: sql<number>`count(*)`,
    })
    .from(reactions)
    .where(eq(reactions.boutId, boutId))
    .groupBy(reactions.turnIndex, reactions.reactionType);

  const map: ReactionCountMap = {};
  rows.forEach((row) => {
    const entry = map[row.turnIndex] ?? { heart: 0, fire: 0 };
    if (row.reactionType === 'heart') {
      entry.heart = Number(row.count);
    } else if (row.reactionType === 'fire') {
      entry.fire = Number(row.count);
    }
    map[row.turnIndex] = entry;
  });

  return map;
}

/**
 * Get the turn with the most total reactions (heart + fire) for a bout.
 * Used for OG hero images — the most-reacted turn is the "highlight".
 *
 * Returns null if the bout has no reactions.
 */
export async function getMostReactedTurnIndex(boutId: string) {
  const db = requireDb();
  const [top] = await db
    .select({
      turnIndex: reactions.turnIndex,
      totalCount: sql<number>`cast(count(*) as int)`,
      heartCount: sql<number>`cast(count(*) filter (where ${reactions.reactionType} = 'heart') as int)`,
      fireCount: sql<number>`cast(count(*) filter (where ${reactions.reactionType} = 'fire') as int)`,
    })
    .from(reactions)
    .where(eq(reactions.boutId, boutId))
    .groupBy(reactions.turnIndex)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  return top && top.totalCount > 0 ? top : null;
}
