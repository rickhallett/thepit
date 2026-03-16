// Winner voting for completed bouts. One vote per user per bout (enforced
// by a unique index). Vote tallies drive the leaderboard and create
// evolutionary selection pressure: agents with more wins get cloned more.

import { and, eq, sql } from 'drizzle-orm';

import { requireDb } from '@/db';
import { bouts, winnerVotes } from '@/db/schema';

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

/**
 * Cast a winner vote after validating the bout exists and the agent
 * participated. Uses onConflictDoNothing for idempotent duplicate handling.
 */
export async function castWinnerVote(params: {
  boutId: string;
  agentId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { boutId, agentId, userId } = params;
  const db = requireDb();

  const [bout] = await db
    .select({
      id: bouts.id,
      transcript: bouts.transcript,
      agentLineup: bouts.agentLineup,
    })
    .from(bouts)
    .where(eq(bouts.id, boutId))
    .limit(1);

  if (!bout) {
    return { ok: false, error: 'Bout not found.', status: 404 };
  }

  // Verify the agent actually participated in this bout
  const inTranscript = Array.isArray(bout.transcript)
    && bout.transcript.some((t: { agentId?: string }) => t.agentId === agentId);
  const inLineup = Array.isArray(bout.agentLineup)
    && bout.agentLineup.some((a: { id?: string }) => a.id === agentId);

  if (!inTranscript && !inLineup) {
    return { ok: false, error: 'Agent was not a participant in this bout.', status: 403 };
  }

  await db
    .insert(winnerVotes)
    .values({ boutId, agentId, userId })
    .onConflictDoNothing();

  return { ok: true };
}
