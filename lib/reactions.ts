// Per-turn reaction counts (heart/fire) for bout turns.
// Reactions are crowd signals used for research data and social proof.

import { and, eq, sql, desc } from 'drizzle-orm';

import { requireDb } from '@/db';
import { reactions } from '@/db/schema';
import { assertNever } from '@/lib/api-utils';

/** Single source of truth for valid reaction types. Derive all other
 *  representations (Zod enum, TypeScript union) from this tuple. */
export const REACTION_TYPES = ['heart', 'fire'] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export type ReactionCountMap = Record<number, { heart: number; fire: number }>;

/**
 * Get the set of reactions a specific user has given on a bout.
 * Returns an array of "turnIndex:reactionType" keys for hydrating
 * the client-side userReactions set on page load.
 */
export async function getUserReactions(boutId: string, userId: string): Promise<string[]> {
  const db = requireDb();
  const rows = await db
    .select({
      turnIndex: reactions.turnIndex,
      reactionType: reactions.reactionType,
    })
    .from(reactions)
    .where(
      and(
        eq(reactions.boutId, boutId),
        eq(reactions.userId, userId),
      ),
    );

  return rows.map((r) => `${r.turnIndex}:${r.reactionType}`);
}

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
    const type = row.reactionType as ReactionType;
    switch (type) {
      case 'heart':
        entry.heart = Number(row.count);
        break;
      case 'fire':
        entry.fire = Number(row.count);
        break;
      default:
        assertNever(type, `Unknown reaction type: ${row.reactionType}`);
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
    .orderBy(desc(sql`count(*)`), desc(reactions.turnIndex))
    .limit(1);

  return top && top.totalCount > 0 ? top : null;
}
