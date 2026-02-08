import { eq, sql } from 'drizzle-orm';

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
