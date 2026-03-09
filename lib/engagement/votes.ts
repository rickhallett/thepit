// Winner votes library — cast votes, get counts, check user's vote.
// One vote per user per bout. No vote changes allowed (DB unique constraint).
// Authenticated users only (no anonymous voting).
// Vote only allowed on completed bouts with agents that participated.

import { z } from "zod";
import { db } from "@/db";
import { winnerVotes, bouts } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const WinnerVoteRequestSchema = z.object({
  boutId: z.string().min(1, "boutId is required").max(21),
  agentId: z.string().min(1, "agentId is required").max(128),
});

export type WinnerVoteRequest = z.infer<typeof WinnerVoteRequestSchema>;

export class VoteValidationError extends Error {
  constructor(
    message: string,
    public readonly code: "BOUT_NOT_FOUND" | "BOUT_NOT_COMPLETED" | "AGENT_NOT_IN_BOUT",
  ) {
    super(message);
    this.name = "VoteValidationError";
  }
}

interface AgentLineupEntry {
  id: string;
  [key: string]: unknown;
}

/**
 * Cast a winner vote for a bout.
 * Validates: bout exists, bout is completed, agent participated in bout.
 * Uses INSERT ... ON CONFLICT DO NOTHING to handle duplicates atomically.
 * Returns { ok: true, alreadyVoted: false } on success.
 * Returns { ok: true, alreadyVoted: true } if user already voted.
 * Throws VoteValidationError if validation fails.
 */
export async function castWinnerVote(params: {
  boutId: string;
  userId: string;
  agentId: string;
}): Promise<{ ok: boolean; alreadyVoted: boolean }> {
  const { boutId, userId, agentId } = params;

  // Validate bout exists and is completed
  const [bout] = await db
    .select({ status: bouts.status, agentLineup: bouts.agentLineup })
    .from(bouts)
    .where(eq(bouts.id, boutId))
    .limit(1);

  if (!bout) {
    throw new VoteValidationError("Bout not found", "BOUT_NOT_FOUND");
  }

  if (bout.status !== "completed") {
    throw new VoteValidationError(
      "Voting is only allowed on completed bouts",
      "BOUT_NOT_COMPLETED",
    );
  }

  // Validate agent participated in this bout
  const lineup = bout.agentLineup as AgentLineupEntry[] | null;
  if (!lineup || !lineup.some((a) => a.id === agentId)) {
    throw new VoteValidationError(
      "Agent did not participate in this bout",
      "AGENT_NOT_IN_BOUT",
    );
  }

  // Use returning() to reliably detect insert vs conflict.
  // Drizzle's onConflictDoNothing + returning returns empty array on conflict,
  // non-empty array on successful insert.
  const inserted = await db
    .insert(winnerVotes)
    .values({ boutId, userId, agentId })
    .onConflictDoNothing({ target: [winnerVotes.boutId, winnerVotes.userId] })
    .returning({ id: winnerVotes.id });

  return {
    ok: true,
    alreadyVoted: inserted.length === 0,
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
