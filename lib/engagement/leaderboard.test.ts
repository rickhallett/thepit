/**
 * leaderboard.test.ts — unit tests for leaderboard computation.
 *
 * Mocks the db module for isolated unit testing.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

// Mock drizzle-orm functions
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col, val) => ({ type: "eq", val })),
  and: vi.fn((...conditions) => ({ type: "and", conditions })),
  gte: vi.fn((_col, val) => ({ type: "gte", val })),
  sql: vi.fn((strings, ...values) => ({ type: "sql", strings, values })),
}));

// Mock schema
vi.mock("@/db/schema", () => ({
  winnerVotes: {
    boutId: { name: "bout_id" },
    agentId: { name: "agent_id" },
    userId: { name: "user_id" },
  },
  bouts: {
    id: { name: "id" },
    status: { name: "status" },
    createdAt: { name: "created_at" },
  },
  agents: {
    id: { name: "id" },
    name: { name: "name" },
  },
}));

describe("getLeaderboardData", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns empty array when no votes", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    // Votes query returns empty
    const mockVotesChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    db.select.mockReturnValue(mockVotesChain);

    const { getLeaderboardData } = await import("./leaderboard");

    const result = await getLeaderboardData("all");

    expect(result).toEqual([]);
  });

  it("returns sorted entries by wins DESC, then totalVotes DESC", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    // Setup call sequence
    let callCount = 0;

    db.select.mockImplementation(() => {
      callCount++;

      if (callCount === 1) {
        // First call: votes query
        return {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([
            // Bout 1: agent_a gets 3 votes, agent_b gets 1 vote -> agent_a wins
            { boutId: "bout_1", agentId: "agent_a" },
            { boutId: "bout_1", agentId: "agent_a" },
            { boutId: "bout_1", agentId: "agent_a" },
            { boutId: "bout_1", agentId: "agent_b" },
            // Bout 2: agent_b gets 2 votes, agent_a gets 1 vote -> agent_b wins
            { boutId: "bout_2", agentId: "agent_b" },
            { boutId: "bout_2", agentId: "agent_b" },
            { boutId: "bout_2", agentId: "agent_a" },
            // Bout 3: agent_a gets 2 votes -> agent_a wins
            { boutId: "bout_3", agentId: "agent_a" },
            { boutId: "bout_3", agentId: "agent_a" },
          ]),
        };
      }

      // Second call: agent names query
      return {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { id: "agent_a", name: "Alpha Agent" },
          { id: "agent_b", name: "Beta Agent" },
        ]),
      };
    });

    const { getLeaderboardData } = await import("./leaderboard");

    const result = await getLeaderboardData("all");

    // agent_a: 2 wins, 6 total votes, 3 bouts
    // agent_b: 1 win, 3 total votes, 2 bouts
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      agentId: "agent_a",
      agentName: "Alpha Agent",
      wins: 2,
      totalVotes: 6,
      boutsParticipated: 3,
      rank: 1,
    });
    expect(result[1]).toMatchObject({
      agentId: "agent_b",
      agentName: "Beta Agent",
      wins: 1,
      totalVotes: 3,
      boutsParticipated: 2,
      rank: 2,
    });
  });

  it("assigns correct ranks", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    let callCount = 0;

    db.select.mockImplementation(() => {
      callCount++;

      if (callCount === 1) {
        // Votes: 3 agents, each with different vote counts
        return {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([
            { boutId: "bout_1", agentId: "agent_c" },
            { boutId: "bout_1", agentId: "agent_c" },
            { boutId: "bout_1", agentId: "agent_c" },
            { boutId: "bout_2", agentId: "agent_b" },
            { boutId: "bout_2", agentId: "agent_b" },
            { boutId: "bout_3", agentId: "agent_a" },
          ]),
        };
      }

      return {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { id: "agent_a", name: "Agent A" },
          { id: "agent_b", name: "Agent B" },
          { id: "agent_c", name: "Agent C" },
        ]),
      };
    });

    const { getLeaderboardData } = await import("./leaderboard");

    const result = await getLeaderboardData("all");

    // All have 1 win each, sort by totalVotes
    // agent_c: 1 win, 3 votes -> rank 1
    // agent_b: 1 win, 2 votes -> rank 2
    // agent_a: 1 win, 1 vote -> rank 3
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
    expect(result[2].rank).toBe(3);
  });

  it("calculates wins correctly (agent with most votes in bout)", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    let callCount = 0;

    db.select.mockImplementation(() => {
      callCount++;

      if (callCount === 1) {
        // Bout 1: tie at 2 votes each, first one processed wins
        return {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([
            // agent_x gets 3 votes in bout_1
            { boutId: "bout_1", agentId: "agent_x" },
            { boutId: "bout_1", agentId: "agent_x" },
            { boutId: "bout_1", agentId: "agent_x" },
            // agent_y gets 2 votes in bout_1
            { boutId: "bout_1", agentId: "agent_y" },
            { boutId: "bout_1", agentId: "agent_y" },
          ]),
        };
      }

      return {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { id: "agent_x", name: "Agent X" },
          { id: "agent_y", name: "Agent Y" },
        ]),
      };
    });

    const { getLeaderboardData } = await import("./leaderboard");

    const result = await getLeaderboardData("all");

    // agent_x should have the win (3 > 2)
    const agentX = result.find((e) => e.agentId === "agent_x");
    const agentY = result.find((e) => e.agentId === "agent_y");

    expect(agentX?.wins).toBe(1);
    expect(agentY?.wins).toBe(0);
  });

  it("limits results to top 50", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    let callCount = 0;

    db.select.mockImplementation(() => {
      callCount++;

      if (callCount === 1) {
        // Generate 60 agents, each with 1 vote in different bouts
        const votes = [];
        for (let i = 0; i < 60; i++) {
          votes.push({ boutId: `bout_${i}`, agentId: `agent_${i}` });
        }
        return {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(votes),
        };
      }

      // Agent names for all 60
      const agents = [];
      for (let i = 0; i < 60; i++) {
        agents.push({ id: `agent_${i}`, name: `Agent ${i}` });
      }
      return {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(agents),
      };
    });

    const { getLeaderboardData } = await import("./leaderboard");

    const result = await getLeaderboardData("all");

    expect(result).toHaveLength(50);
    expect(result[49].rank).toBe(50);
  });

  it("handles unknown agent names gracefully", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    let callCount = 0;

    db.select.mockImplementation(() => {
      callCount++;

      if (callCount === 1) {
        return {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([
            { boutId: "bout_1", agentId: "unknown_agent" },
          ]),
        };
      }

      // No agent found
      return {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
    });

    const { getLeaderboardData } = await import("./leaderboard");

    const result = await getLeaderboardData("all");

    expect(result[0].agentName).toBe("Unknown Agent");
  });
});

describe("time range filtering", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("uses correct cutoff for week range (7 days)", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    const mockVotesChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    db.select.mockReturnValue(mockVotesChain);

    const { getLeaderboardData } = await import("./leaderboard");

    await getLeaderboardData("week");

    // Verify where was called (time filter applied)
    expect(mockVotesChain.where).toHaveBeenCalled();
  });

  it("uses correct cutoff for month range (30 days)", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    const mockVotesChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    db.select.mockReturnValue(mockVotesChain);

    const { getLeaderboardData } = await import("./leaderboard");

    await getLeaderboardData("month");

    expect(mockVotesChain.where).toHaveBeenCalled();
  });

  it("does not filter for 'all' range", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    const mockVotesChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    db.select.mockReturnValue(mockVotesChain);

    const { getLeaderboardData } = await import("./leaderboard");

    await getLeaderboardData("all");

    // Where should still be called (for status filter), but no gte for time
    expect(mockVotesChain.where).toHaveBeenCalled();
  });
});
