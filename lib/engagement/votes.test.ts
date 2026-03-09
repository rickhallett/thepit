/**
 * votes.test.ts — unit tests for winner votes library.
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
    insert: vi.fn(),
  },
}));

// Mock drizzle-orm functions
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col, val) => ({ type: "eq", val })),
  and: vi.fn((...conditions) => ({ type: "and", conditions })),
  sql: vi.fn((strings, ...values) => ({ type: "sql", strings, values })),
}));

// Mock schema
vi.mock("@/db/schema", () => ({
  winnerVotes: {
    id: { name: "id" },
    boutId: { name: "bout_id" },
    userId: { name: "user_id" },
    agentId: { name: "agent_id" },
  },
}));

describe("WinnerVoteRequestSchema", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("validates correct request", async () => {
    const { WinnerVoteRequestSchema } = await import("./votes");

    const result = WinnerVoteRequestSchema.safeParse({
      boutId: "bout_abc123",
      agentId: "agent_xyz",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing boutId", async () => {
    const { WinnerVoteRequestSchema } = await import("./votes");

    const result = WinnerVoteRequestSchema.safeParse({
      agentId: "agent_xyz",
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing agentId", async () => {
    const { WinnerVoteRequestSchema } = await import("./votes");

    const result = WinnerVoteRequestSchema.safeParse({
      boutId: "bout_abc123",
    });

    expect(result.success).toBe(false);
  });
});

describe("castWinnerVote", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns ok=true, alreadyVoted=false when vote is cast (rowCount=1)", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    // Setup: insert returns rowCount 1 (success)
    const mockInsertChain = {
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockResolvedValue({ rowCount: 1 }),
    };
    db.insert.mockReturnValue(mockInsertChain);

    const { castWinnerVote } = await import("./votes");

    const result = await castWinnerVote({
      boutId: "bout_abc",
      userId: "user_123",
      agentId: "agent_xyz",
    });

    expect(result.ok).toBe(true);
    expect(result.alreadyVoted).toBe(false);
    expect(db.insert).toHaveBeenCalled();
  });

  it("returns ok=true, alreadyVoted=true when vote exists (rowCount=0)", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    // Setup: insert returns rowCount 0 (conflict)
    const mockInsertChain = {
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockResolvedValue({ rowCount: 0 }),
    };
    db.insert.mockReturnValue(mockInsertChain);

    const { castWinnerVote } = await import("./votes");

    const result = await castWinnerVote({
      boutId: "bout_abc",
      userId: "user_123",
      agentId: "agent_xyz",
    });

    expect(result.ok).toBe(true);
    expect(result.alreadyVoted).toBe(true);
  });

  it("handles undefined rowCount as already voted", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    // Setup: rowCount undefined (edge case)
    const mockInsertChain = {
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockResolvedValue({}),
    };
    db.insert.mockReturnValue(mockInsertChain);

    const { castWinnerVote } = await import("./votes");

    const result = await castWinnerVote({
      boutId: "bout_abc",
      userId: "user_123",
      agentId: "agent_xyz",
    });

    expect(result.ok).toBe(true);
    expect(result.alreadyVoted).toBe(true);
  });
});

describe("getWinnerVoteCounts", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns Map with correct counts per agent", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    const mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([
        { agentId: "agent_a", count: 5 },
        { agentId: "agent_b", count: 3 },
        { agentId: "agent_c", count: 1 },
      ]),
    };
    db.select.mockReturnValue(mockSelectChain);

    const { getWinnerVoteCounts } = await import("./votes");

    const result = await getWinnerVoteCounts("bout_abc");

    expect(result).toBeInstanceOf(Map);
    expect(result.get("agent_a")).toBe(5);
    expect(result.get("agent_b")).toBe(3);
    expect(result.get("agent_c")).toBe(1);
    expect(result.size).toBe(3);
  });

  it("returns empty Map when no votes", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    const mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([]),
    };
    db.select.mockReturnValue(mockSelectChain);

    const { getWinnerVoteCounts } = await import("./votes");

    const result = await getWinnerVoteCounts("bout_empty");

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it("skips null agentIds", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    const mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([
        { agentId: "agent_a", count: 5 },
        { agentId: null, count: 2 },
      ]),
    };
    db.select.mockReturnValue(mockSelectChain);

    const { getWinnerVoteCounts } = await import("./votes");

    const result = await getWinnerVoteCounts("bout_abc");

    expect(result.size).toBe(1);
    expect(result.get("agent_a")).toBe(5);
  });
});

describe("getUserWinnerVote", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns agentId when user has voted", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    const mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ agentId: "agent_winner" }]),
    };
    db.select.mockReturnValue(mockSelectChain);

    const { getUserWinnerVote } = await import("./votes");

    const result = await getUserWinnerVote("bout_abc", "user_123");

    expect(result).toBe("agent_winner");
  });

  it("returns null when user has not voted", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    const mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    db.select.mockReturnValue(mockSelectChain);

    const { getUserWinnerVote } = await import("./votes");

    const result = await getUserWinnerVote("bout_abc", "user_456");

    expect(result).toBeNull();
  });
});
