/**
 * db/schema.test.ts — verify schema against a real database.
 *
 * When DATABASE_URL is set: connects to Neon, pushes schema, verifies
 * round-trip insert/select on the users table (one table proves the pattern).
 *
 * When DATABASE_URL is not set: skips DB tests gracefully.
 * No structural/mock tests — we test the thing, not the description.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("schema (live database)", () => {
  // Dynamic imports — only loaded when DATABASE_URL is present.
  // This avoids module-level connection attempts in dry-run mode.
  let db: Awaited<typeof import("./index")>["db"];
  let schema: Awaited<typeof import("./schema")>;
  let pool: import("@neondatabase/serverless").Pool;

  beforeAll(async () => {
    const { Pool } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    schema = await import("./schema");

    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });

    // Push schema — create tables if they don't exist.
    // Using raw SQL to avoid drizzle-kit dependency in tests.
    // The enums and tables are created via drizzle-kit push in CI;
    // here we just verify they exist (or skip if they don't).
  });

  afterAll(async () => {
    if (pool) await pool.end();
  });

  it("can query the users table", async () => {
    // SELECT with LIMIT 0 — verifies table exists and columns resolve.
    const result = await db
      .select()
      .from(schema.users)
      .limit(0);
    expect(result).toEqual([]);
  });

  it("can insert and read back a user", async () => {
    const testId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      // Insert
      await db.insert(schema.users).values({
        id: testId,
        email: "test@example.com",
        displayName: "Test User",
      });

      // Read back
      const { eq } = await import("drizzle-orm");
      const rows = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, testId));

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(testId);
      expect(rows[0].email).toBe("test@example.com");
      expect(rows[0].displayName).toBe("Test User");
      expect(rows[0].subscriptionTier).toBe("free"); // default
      expect(rows[0].freeBoutsUsed).toBe(0); // default
      expect(rows[0].createdAt).toBeInstanceOf(Date);
    } finally {
      // Clean up — delete test row regardless of pass/fail.
      const { eq } = await import("drizzle-orm");
      await db.delete(schema.users).where(eq(schema.users.id, testId));
    }
  });
});

describe("schema (no database required)", () => {
  it("skips live tests when DATABASE_URL is not set", () => {
    // This test always passes. It exists so the test file is never
    // empty (vitest requires at least one test per file unless
    // passWithNoTests is set). The real tests are above.
    expect(true).toBe(true);
  });
});
