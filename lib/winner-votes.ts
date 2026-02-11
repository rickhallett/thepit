// Winner voting for completed bouts. One vote per user per bout (enforced
// by a unique index). Vote tallies drive the leaderboard and create
// evolutionary selection pressure: agents with more wins get cloned more.

import { and, eq, sql } from 'drizzle-orm';

import { requireDb } from '@/db';
import { winnerVotes } from '@/db/schema';

export type WinnerVoteCounts = Record<string, number>;

export async function getWinnerVoteCounts(boutId: string) {
  const db = requireDb();
  const rows = await db
    .select({
      agentId: winnerVotes.agentId,
      count: sql<number>`count(*)`,
    })
    .from(winnerVotes)
    .where(eq(winnerVotes.boutId, boutId))
    .groupBy(winnerVotes.agentId);

  const map: WinnerVoteCounts = {};
  rows.forEach((row) => {
    map[row.agentId] = Number(row.count);
  });

  return map;
}

export async function getUserWinnerVote(boutId: string, userId: string) {
  const db = requireDb();
  const [existing] = await db
    .select({ agentId: winnerVotes.agentId })
    .from(winnerVotes)
    .where(
      and(eq(winnerVotes.boutId, boutId), eq(winnerVotes.userId, userId)),
    )
    .limit(1);

  return existing?.agentId ?? null;
}
