import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureReferralCode } from "./referrals";

// Track mock state for select/update behavior
let mockSelectResult: { referralCode: string | null }[] = [];
let mockUpdateResult: { referralCode: string }[] = [];
let mockUpdateAttemptCount = 0;
let mockUpdateFailsUntilAttempt = 0;
let mockSelectCallCount = 0;

// Mock the db module
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            mockSelectCallCount++;
            // Return different results based on call order for race condition tests
            if (mockSelectCallCount === 2 && mockSelectResult.length > 1) {
              return Promise.resolve([mockSelectResult[1]]);
            }
            return Promise.resolve(mockSelectResult.length > 0 ? [mockSelectResult[0]] : []);
          }),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => {
            mockUpdateAttemptCount++;
            if (mockUpdateFailsUntilAttempt > 0 && mockUpdateAttemptCount <= mockUpdateFailsUntilAttempt) {
              const error = new Error("duplicate key value") as Error & { code: string };
              error.code = "23505";
              return Promise.reject(error);
            }
            return Promise.resolve(mockUpdateResult);
          }),
        })),
      })),
    })),
  },
}));

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "abc12345"),
}));

describe("ensureReferralCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectResult = [];
    mockUpdateResult = [];
    mockUpdateAttemptCount = 0;
    mockUpdateFailsUntilAttempt = 0;
    mockSelectCallCount = 0;
  });

  it("returns existing code if user already has one", async () => {
    mockSelectResult = [{ referralCode: "existing1" }];

    const result = await ensureReferralCode("user_123");

    expect(result).toBe("existing1");
  });

  it("generates new code if user has no referral code", async () => {
    // First select returns no code, update succeeds
    mockSelectResult = [{ referralCode: null }];
    mockUpdateResult = [{ referralCode: "abc12345" }];

    const result = await ensureReferralCode("user_456");

    expect(result).toBe("abc12345");
  });

  it("retries on unique constraint violation (collision)", async () => {
    // First select returns no code
    mockSelectResult = [{ referralCode: null }];
    // Fail first 2 attempts, succeed on 3rd
    mockUpdateFailsUntilAttempt = 2;
    mockUpdateResult = [{ referralCode: "abc12345" }];

    const result = await ensureReferralCode("user_789");

    expect(result).toBe("abc12345");
    expect(mockUpdateAttemptCount).toBe(3);
  });

  it("throws after max retries exhausted", async () => {
    // First select returns no code
    mockSelectResult = [{ referralCode: null }];
    // Fail all 4 attempts
    mockUpdateFailsUntilAttempt = 4;

    await expect(ensureReferralCode("user_fail")).rejects.toThrow(
      "Failed to generate unique referral code after 4 attempts"
    );
  });

  it("handles race condition — returns code set by another process", async () => {
    // First select: no code
    // Update: no rows affected (returned empty)
    // Second select: code now exists (set by another process)
    mockSelectResult = [
      { referralCode: null },
      { referralCode: "racewin1" },
    ];
    mockUpdateResult = []; // No rows affected

    const result = await ensureReferralCode("user_race");

    expect(result).toBe("racewin1");
  });
});
