/**
 * reactions.test.ts — unit tests for reactions library.
 *
 * Mocks the db module for isolated unit testing.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeFingerprint } from "./reactions";

// Mock the db module. toggleReaction uses db.transaction(), so we mock
// a transaction function that passes a mock tx to the callback.
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
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
  reactions: {
    id: { name: "id" },
    boutId: { name: "bout_id" },
    turnIndex: { name: "turn_index" },
    reactionType: { name: "reaction_type" },
    userId: { name: "user_id" },
    clientFingerprint: { name: "client_fingerprint" },
  },
}));

describe("computeFingerprint", () => {
  it("returns userId for authenticated users", () => {
    const result = computeFingerprint("user_123", "192.168.1.1");
    expect(result).toBe("user_123");
  });

  it("returns anon:{hash} for anonymous users", () => {
    const result = computeFingerprint(null, "192.168.1.1");
    expect(result).toMatch(/^anon:[a-f0-9]{16}$/);
  });

  it("produces consistent hash for same IP", () => {
    const r1 = computeFingerprint(null, "10.0.0.1");
    const r2 = computeFingerprint(null, "10.0.0.1");
    expect(r1).toBe(r2);
  });

  it("produces different hash for different IPs", () => {
    const r1 = computeFingerprint(null, "10.0.0.1");
    const r2 = computeFingerprint(null, "10.0.0.2");
    expect(r1).not.toBe(r2);
  });

  it("prefers userId over IP even when both provided", () => {
    const result = computeFingerprint("user_456", "192.168.1.1");
    expect(result).toBe("user_456");
    expect(result).not.toMatch(/^anon:/);
  });
});

describe("toggleReaction", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  /**
   * Helper: creates a mock tx object for db.transaction() and configures
   * db.transaction to call the callback with that tx.
   */
  function setupTransactionMock(
    db: Record<string, ReturnType<typeof vi.fn>>,
    opts: {
      existingReaction: { id: number } | null;
      countsAfter: Array<{ reactionType: string; count: number }>;
    },
  ) {
    const mockInsert = vi.fn();
    const mockDelete = vi.fn();
    const mockSelect = vi.fn();

    // select chain: first call = existence check (limit), second call = counts (groupBy)
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(
        opts.existingReaction ? [opts.existingReaction] : [],
      ),
      groupBy: vi.fn().mockResolvedValue(opts.countsAfter),
    };
    mockSelect.mockReturnValue(selectChain);

    // insert chain
    const insertChain = { values: vi.fn().mockResolvedValue(undefined) };
    mockInsert.mockReturnValue(insertChain);

    // delete chain
    const deleteChain = { where: vi.fn().mockResolvedValue(undefined) };
    mockDelete.mockReturnValue(deleteChain);

    const tx = { select: mockSelect, insert: mockInsert, delete: mockDelete };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.transaction.mockImplementation(async (cb: (t: any) => Promise<unknown>) => cb(tx));

    return { tx, mockInsert, mockDelete, mockSelect };
  }

  it("inserts new reaction when none exists (action=added)", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    const { mockInsert } = setupTransactionMock(db, {
      existingReaction: null,
      countsAfter: [
        { reactionType: "heart", count: 1 },
        { reactionType: "fire", count: 0 },
      ],
    });

    const { toggleReaction } = await import("./reactions");

    const result = await toggleReaction({
      boutId: "bout_abc",
      turnIndex: 0,
      reactionType: "heart",
      userId: null,
      clientFingerprint: "anon:abc123",
    });

    expect(result.action).toBe("added");
    // Verify insert was actually called (not just select)
    expect(mockInsert).toHaveBeenCalled();
  });

  it("deletes existing reaction (action=removed)", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    const { mockDelete } = setupTransactionMock(db, {
      existingReaction: { id: 42 },
      countsAfter: [
        { reactionType: "heart", count: 0 },
        { reactionType: "fire", count: 2 },
      ],
    });

    const { toggleReaction } = await import("./reactions");

    const result = await toggleReaction({
      boutId: "bout_abc",
      turnIndex: 0,
      reactionType: "heart",
      userId: "user_123",
      clientFingerprint: "user_123",
    });

    expect(result.action).toBe("removed");
    // Verify delete was actually called
    expect(mockDelete).toHaveBeenCalled();
  });

  it("returns correct counts after toggle", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    setupTransactionMock(db, {
      existingReaction: null,
      countsAfter: [
        { reactionType: "heart", count: 5 },
        { reactionType: "fire", count: 3 },
      ],
    });

    const { toggleReaction } = await import("./reactions");

    const result = await toggleReaction({
      boutId: "bout_xyz",
      turnIndex: 2,
      reactionType: "fire",
      userId: null,
      clientFingerprint: "anon:xyz789",
    });

    expect(result.counts).toEqual({ heart: 5, fire: 3 });
  });
});

describe("getReactionCounts", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns Map with correct structure", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    const mockChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([
        { turnIndex: 0, reactionType: "heart", count: 10 },
        { turnIndex: 0, reactionType: "fire", count: 5 },
        { turnIndex: 1, reactionType: "heart", count: 3 },
      ]),
    };
    db.select.mockReturnValue(mockChain);

    const { getReactionCounts } = await import("./reactions");

    const result = await getReactionCounts("bout_abc");

    expect(result).toBeInstanceOf(Map);
    expect(result.get(0)).toEqual({ heart: 10, fire: 5 });
    expect(result.get(1)).toEqual({ heart: 3, fire: 0 });
    expect(result.has(2)).toBe(false);
  });

  it("returns empty Map when no reactions", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    const mockChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([]),
    };
    db.select.mockReturnValue(mockChain);

    const { getReactionCounts } = await import("./reactions");

    const result = await getReactionCounts("bout_empty");

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });
});

describe("getUserReactions", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns Set of turnIndex:type strings", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { turnIndex: 0, reactionType: "heart" },
          { turnIndex: 2, reactionType: "fire" },
          { turnIndex: 2, reactionType: "heart" },
        ]),
      }),
    });

    const { getUserReactions } = await import("./reactions");

    const result = await getUserReactions("bout_abc", "user_123");

    expect(result).toBeInstanceOf(Set);
    expect(result.has("0:heart")).toBe(true);
    expect(result.has("2:fire")).toBe(true);
    expect(result.has("2:heart")).toBe(true);
    expect(result.has("1:heart")).toBe(false);
  });

  it("returns empty Set when no reactions", async () => {
    const dbModule = await import("@/db");
    const db = dbModule.db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const { getUserReactions } = await import("./reactions");

    const result = await getUserReactions("bout_abc", "anon:xyz");

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });
});
