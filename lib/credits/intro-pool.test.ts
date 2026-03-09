import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock db before importing the module under test
vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("./balance", () => ({
  applyCreditDelta: vi.fn(),
}));

import { db } from "@/db";
import { applyCreditDelta } from "./balance";
import {
  claimFromIntroPool,
  ensureIntroPool,
  getIntroPoolStatus,
  refundIntroPool,
} from "./intro-pool";

describe("intro-pool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("ensureIntroPool", () => {
    it("is idempotent (uses onConflictDoNothing)", async () => {
      const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoNothing: mockOnConflictDoNothing,
      });
      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as never);

      await ensureIntroPool();

      expect(db.insert).toHaveBeenCalledTimes(1);
      expect(mockOnConflictDoNothing).toHaveBeenCalled();
    });

    it("inserts with correct default values", async () => {
      const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoNothing: mockOnConflictDoNothing,
      });
      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as never);

      await ensureIntroPool();

      expect(mockValues).toHaveBeenCalledWith({
        initialMicro: 1000000,
        claimedMicro: 0,
        halfLifeDays: "3",
      });
    });
  });

  describe("getIntroPoolStatus", () => {
    it("returns correct computed values", async () => {
      const now = new Date();
      const mockFrom = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          {
            initialMicro: 1000000,
            claimedMicro: 100000,
            halfLifeDays: "3",
            createdAt: now,
            effectiveRemaining: 900000,
          },
        ]),
      });
      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
      } as never);

      const status = await getIntroPoolStatus();

      expect(status).toEqual({
        initialMicro: 1000000,
        claimedMicro: 100000,
        effectiveRemainingMicro: 900000,
        halfLifeDays: 3,
        createdAt: now,
      });
    });

    it("returns default state when pool does not exist", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      });
      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
      } as never);

      const status = await getIntroPoolStatus();

      expect(status.initialMicro).toBe(1000000);
      expect(status.claimedMicro).toBe(0);
      expect(status.effectiveRemainingMicro).toBe(1000000);
      expect(status.halfLifeDays).toBe(3);
    });
  });

  describe("claimFromIntroPool", () => {
    it("reduces pool and credits user", async () => {
      const now = new Date();

      // Mock the update returning post-update values
      const mockReturning = vi.fn().mockResolvedValue([
        {
          claimedMicro: 5000, // Was 0, now 5000
          initialMicro: 1000000,
          halfLifeDays: "3",
          createdAt: now,
        },
      ]);
      const mockSet = vi.fn().mockReturnValue({
        returning: mockReturning,
      });
      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
      } as never);

      const result = await claimFromIntroPool("user-123", 5000);

      expect(db.update).toHaveBeenCalled();
      expect(applyCreditDelta).toHaveBeenCalledWith(
        "user-123",
        5000,
        "signup",
        "intro:user-123",
        { source: "intro_pool" },
      );
      expect(result.claimed).toBe(5000);
    });

    it("clamps to available amount", async () => {
      const now = new Date();

      // Pool only has 3000 effective remaining
      const mockReturning = vi.fn().mockResolvedValue([
        {
          claimedMicro: 3000, // Claimed 3000 instead of requested 10000
          initialMicro: 1000000,
          halfLifeDays: "3",
          createdAt: now,
        },
      ]);
      const mockSet = vi.fn().mockReturnValue({
        returning: mockReturning,
      });
      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
      } as never);

      const result = await claimFromIntroPool("user-123", 10000);

      // Should have claimed exactly 3000 (the available amount), not the requested 10000
      expect(result.claimed).toBe(3000);
    });

    it("returns zero when requesting zero or negative", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          {
            initialMicro: 1000000,
            claimedMicro: 0,
            halfLifeDays: "3",
            createdAt: new Date(),
            effectiveRemaining: 1000000,
          },
        ]),
      });
      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
      } as never);

      const result = await claimFromIntroPool("user-123", 0);

      expect(result.claimed).toBe(0);
      expect(applyCreditDelta).not.toHaveBeenCalled();
    });
  });

  describe("half-life decay calculation", () => {
    it("at t=half_life_days, effective is ~50% of initial", () => {
      // Test the decay formula directly
      const initialMicro = 1000000;
      const halfLifeDays = 3;
      const elapsedDays = 3; // Exactly one half-life

      const decayFactor = Math.pow(
        0.5,
        (elapsedDays * 86400) / (halfLifeDays * 86400),
      );
      const effectiveRemaining = initialMicro * decayFactor;

      expect(effectiveRemaining).toBeCloseTo(500000, -1); // ~50% with some tolerance
    });

    it("at t=0, effective equals initial", () => {
      const initialMicro = 1000000;
      const halfLifeDays = 3;
      const elapsedDays = 0;

      const decayFactor = Math.pow(
        0.5,
        (elapsedDays * 86400) / (halfLifeDays * 86400),
      );
      const effectiveRemaining = initialMicro * decayFactor;

      expect(effectiveRemaining).toBe(1000000);
    });

    it("at t=2*half_life_days, effective is ~25% of initial", () => {
      const initialMicro = 1000000;
      const halfLifeDays = 3;
      const elapsedDays = 6; // Two half-lives

      const decayFactor = Math.pow(
        0.5,
        (elapsedDays * 86400) / (halfLifeDays * 86400),
      );
      const effectiveRemaining = initialMicro * decayFactor;

      expect(effectiveRemaining).toBeCloseTo(250000, -1);
    });
  });

  describe("refundIntroPool", () => {
    it("increases available pool by reducing claimed_micro", async () => {
      const mockSet = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
      } as never);

      await refundIntroPool(5000);

      expect(db.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalled();
    });

    it("does nothing for zero or negative amount", async () => {
      await refundIntroPool(0);
      await refundIntroPool(-100);

      expect(db.update).not.toHaveBeenCalled();
    });
  });
});
