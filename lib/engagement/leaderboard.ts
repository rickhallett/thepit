// Leaderboard computation — agent rankings by wins and votes.
// A "win" is when an agent gets the most votes in a completed bout.
// Ranking: wins DESC, totalVotes DESC.

import { db } from "@/db";
import { winnerVotes, bouts, agents } from "@/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";

export type TimeRange = "all" | "week" | "month";

export interface LeaderboardEntry {
  agentId: string;
  agentName: string;
  wins: number;
  totalVotes: number;
  boutsParticipated: number;
  rank: number;
}

/**
 * Get the cutoff date for a time range.
 * Returns null for "all" (no filter).
 */
function getTimeRangeCutoff(range: TimeRange): Date | null {
  if (range === "all") return null;

  const now = new Date();
  const days = range === "week" ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Get leaderboard data for agents.
 *
 * Implementation:
 * 1. Get all votes for completed bouts (optionally filtered by time range)
 * 2. For each bout, determine which agent got the most votes (the winner)
 * 3. Aggregate: total votes, bout participation, wins per agent
 * 4. Sort by wins DESC, totalVotes DESC
 * 5. Assign ranks
 */
export async function getLeaderboardData(
  range: TimeRange,
): Promise<LeaderboardEntry[]> {
  const cutoff = getTimeRangeCutoff(range);

  // Build time filter condition
  const timeFilter = cutoff ? gte(bouts.createdAt, cutoff) : undefined;

  // Step 1: Get all votes with bout info (only completed bouts)
  const votesQuery = db
    .select({
      boutId: winnerVotes.boutId,
      agentId: winnerVotes.agentId,
    })
    .from(winnerVotes)
    .innerJoin(bouts, eq(winnerVotes.boutId, bouts.id))
    .where(
      timeFilter
        ? and(eq(bouts.status, "completed"), timeFilter)
        : eq(bouts.status, "completed"),
    );

  const allVotes = await votesQuery;

  if (allVotes.length === 0) {
    return [];
  }

  // Step 2: Group votes by bout, then by agent within bout
  // Structure: Map<boutId, Map<agentId, voteCount>>
  const boutVotes = new Map<string, Map<string, number>>();
  const agentTotalVotes = new Map<string, number>();
  const agentBouts = new Map<string, Set<string>>();

  for (const vote of allVotes) {
    if (!vote.boutId || !vote.agentId) continue;

    // Per-bout votes
    let boutAgents = boutVotes.get(vote.boutId);
    if (!boutAgents) {
      boutAgents = new Map();
      boutVotes.set(vote.boutId, boutAgents);
    }
    boutAgents.set(vote.agentId, (boutAgents.get(vote.agentId) ?? 0) + 1);

    // Total votes per agent
    agentTotalVotes.set(
      vote.agentId,
      (agentTotalVotes.get(vote.agentId) ?? 0) + 1,
    );

    // Bouts participated
    let boutsSet = agentBouts.get(vote.agentId);
    if (!boutsSet) {
      boutsSet = new Set();
      agentBouts.set(vote.agentId, boutsSet);
    }
    boutsSet.add(vote.boutId);
  }

  // Step 3: Determine winner of each bout (agent with most votes)
  const agentWins = new Map<string, number>();

  for (const [, boutAgentVotes] of boutVotes) {
    let maxVotes = 0;
    let winner: string | null = null;

    for (const [agentId, votes] of boutAgentVotes) {
      if (votes > maxVotes) {
        maxVotes = votes;
        winner = agentId;
      }
    }

    if (winner) {
      agentWins.set(winner, (agentWins.get(winner) ?? 0) + 1);
    }
  }

  // Step 4: Get agent names for all agents with votes
  const agentIds = Array.from(agentTotalVotes.keys());
  const agentRows = await db
    .select({ id: agents.id, name: agents.name })
    .from(agents)
    .where(sql`${agents.id} = ANY(${agentIds})`);

  const agentNames = new Map<string, string>();
  for (const row of agentRows) {
    agentNames.set(row.id, row.name ?? "Unknown Agent");
  }

  // Step 5: Build entries
  const entries: Omit<LeaderboardEntry, "rank">[] = [];

  for (const agentId of agentIds) {
    entries.push({
      agentId,
      agentName: agentNames.get(agentId) ?? "Unknown Agent",
      wins: agentWins.get(agentId) ?? 0,
      totalVotes: agentTotalVotes.get(agentId) ?? 0,
      boutsParticipated: agentBouts.get(agentId)?.size ?? 0,
    });
  }

  // Step 6: Sort by wins DESC, then totalVotes DESC
  entries.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.totalVotes - a.totalVotes;
  });

  // Step 7: Assign ranks (1-indexed) and limit to top 50
  const ranked: LeaderboardEntry[] = entries.slice(0, 50).map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));

  return ranked;
}
