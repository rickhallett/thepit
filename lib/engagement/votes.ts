// Winner votes library — cast votes, get counts, check user's vote.
// One vote per user per bout. No vote changes allowed (DB unique constraint).
// Authenticated users only (no anonymous voting).

import { z } from "zod";
import { db } from "@/db";
import { winnerVotes } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const WinnerVoteRequestSchema = z.object({
  boutId: z.string(),
  agentId: z.string(),
});

export type WinnerVoteRequest = z.infer<typeof WinnerVoteRequestSchema>;

/**
 * Cast a winner vote for a bout.
 * Uses INSERT ... ON CONFLICT DO NOTHING to handle duplicates atomically.
 * Returns { ok: true, alreadyVoted: false } on success.
 * Returns { ok: true, alreadyVoted: true } if user already voted.
 */
export async function castWinnerVote(params: {
  boutId: string;
  userId: string;
  agentId: string;
}): Promise<{ ok: boolean; alreadyVoted: boolean }> {
  const { boutId, userId, agentId } = params;

  // Use raw SQL for ON CONFLICT DO NOTHING behavior
  // Drizzle's onConflictDoNothing returns the affected rows count
  const result = await db
    .insert(winnerVotes)
    .values({ boutId, userId, agentId })
    .onConflictDoNothing({ target: [winnerVotes.boutId, winnerVotes.userId] });

  // rowCount is 0 if conflict occurred (already voted)
  // rowCount is 1 if insert succeeded (new vote)
  const rowCount = result.rowCount ?? 0;

  return {
    ok: true,
    alreadyVoted: rowCount === 0,
  };
}

/**
 * Get vote counts for each agent in a bout.
 * Returns Map<agentId, count>
 */
export async function getWinnerVoteCounts(
  boutId: string,
): Promise<Map<string, number>> {
  const rows = await db
    .select({
      agentId: winnerVotes.agentId,
      count: sql<number>`count(*)::int`,
    })
    .from(winnerVotes)
    .where(eq(winnerVotes.boutId, boutId))
    .groupBy(winnerVotes.agentId);

  const result = new Map<string, number>();
  for (const row of rows) {
    if (row.agentId) {
      result.set(row.agentId, row.count);
    }
  }
  return result;
}

/**
 * Get the agent a user voted for in a bout.
 * Returns agentId or null if user hasn't voted.
 */
export async function getUserWinnerVote(
  boutId: string,
  userId: string,
): Promise<string | null> {
  const rows = await db
    .select({ agentId: winnerVotes.agentId })
    .from(winnerVotes)
    .where(and(eq(winnerVotes.boutId, boutId), eq(winnerVotes.userId, userId)))
    .limit(1);

  return rows.length > 0 ? rows[0].agentId : null;
}
