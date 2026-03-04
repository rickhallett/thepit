import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureUserRecord } from "./users";

// Mock the db module
vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

// Import after mocking
import { db } from "@/db";

describe("ensureUserRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("constructs correct INSERT query", async () => {
    const clerkUserId = "user_123";
    const profile = {
      email: "test@example.com",
      displayName: "Test User",
      imageUrl: "https://example.com/avatar.png",
    };

    await ensureUserRecord(clerkUserId, profile);

    expect(db.insert).toHaveBeenCalledTimes(1);

    const insertMock = vi.mocked(db.insert);
    const valuesMock = insertMock.mock.results[0]?.value?.values;
    expect(valuesMock).toHaveBeenCalledWith({
      id: clerkUserId,
      email: profile.email,
      displayName: profile.displayName,
      imageUrl: profile.imageUrl,
    });
  });

  it("is idempotent — calling twice with same ID does not throw", async () => {
    const clerkUserId = "user_456";
    const profile = {
      email: "another@example.com",
      displayName: null,
      imageUrl: null,
    };

    // Call twice — should not throw
    await expect(ensureUserRecord(clerkUserId, profile)).resolves.toBeUndefined();
    await expect(ensureUserRecord(clerkUserId, profile)).resolves.toBeUndefined();

    // Both calls should have executed (ON CONFLICT DO NOTHING handles duplicates)
    expect(db.insert).toHaveBeenCalledTimes(2);
  });
});
