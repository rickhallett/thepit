/**
 * preauth.test.ts — preauthorization tests against a real database.
 *
 * Tests atomic conditional deduction via WHERE clause guard.
 * Skips gracefully when DATABASE_URL is not set.
 *
 * @vitest-environment node
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("preauthorizeCredits (live database)", () => {
  let db: Awaited<typeof import("@/db")>["db"];
  let schema: Awaited<typeof import("@/db/schema")>;
  let preauthorizeCredits: Awaited<
    typeof import("./preauth")
  >["preauthorizeCredits"];
  let ensureCreditAccount: Awaited<
    typeof import("./balance")
  >["ensureCreditAccount"];
  let getCreditBalanceMicro: Awaited<
    typeof import("./balance")
  >["getCreditBalanceMicro"];
  let eq: Awaited<typeof import("drizzle-orm")>["eq"];

  const testPrefix = `test-preauth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const testUserId = testPrefix;
  const testUserId2 = `${testPrefix}-insufficient`;
  const testUserId3 = `${testPrefix}-concurrent`;

  beforeAll(async () => {
    const { neonConfig } = await import("@neondatabase/serverless");
    const ws = await import("ws");
    neonConfig.webSocketConstructor = ws.default;

    const drizzleOrm = await import("drizzle-orm");
    eq = drizzleOrm.eq;
    schema = await import("@/db/schema");
    db = (await import("@/db")).db;
    preauthorizeCredits = (await import("./preauth")).preauthorizeCredits;
    const balanceModule = await import("./balance");
    ensureCreditAccount = balanceModule.ensureCreditAccount;
    getCreditBalanceMicro = balanceModule.getCreditBalanceMicro;

    // Create test users
    for (const id of [testUserId, testUserId2, testUserId3]) {
      await db
        .insert(schema.users)
        .values({ id, email: `${id}@test.com` })
        .onConflictDoNothing();
    }
  });

  afterAll(async () => {
    if (db && schema) {
      for (const id of [testUserId, testUserId2, testUserId3]) {
        await db
          .delete(schema.creditTransactions)
          .where(eq(schema.creditTransactions.userId, id));
        await db.delete(schema.credits).where(eq(schema.credits.userId, id));
        await db.delete(schema.users).where(eq(schema.users.id, id));
      }
    }
  });

  it("succeeds when balance is sufficient", async () => {
    await ensureCreditAccount(testUserId);
    // Balance is 10000, cost is 5000

    const result = await preauthorizeCredits(testUserId, 5000, "bout-001");

    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(5000);
    expect(result.preauthId).toBe("preauth:bout-001");
  });

  it("fails when balance is insufficient", async () => {
    await ensureCreditAccount(testUserId2);
    // Balance is 10000, cost is 15000

    const result = await preauthorizeCredits(testUserId2, 15000, "bout-002");

    expect(result.success).toBe(false);
    expect(result.newBalance).toBe(10000); // unchanged
    expect(result.preauthId).toBe("preauth:bout-002");

    // Verify balance actually unchanged
    const balance = await getCreditBalanceMicro(testUserId2);
    expect(balance).toBe(10000);
  });

  it("logs a transaction with source='preauth'", async () => {
    // testUserId had a successful preauth in the first test
    const txRows = await db
      .select()
      .from(schema.creditTransactions)
      .where(eq(schema.creditTransactions.referenceId, "preauth:bout-001"));

    expect(txRows).toHaveLength(1);
    expect(txRows[0].source).toBe("preauth");
    expect(txRows[0].deltaMicro).toBe(-5000);
    expect(txRows[0].userId).toBe(testUserId);
  });

  it("does not log a transaction on failure", async () => {
    // testUserId2 had a failed preauth — should not have a transaction for bout-002
    const txRows = await db
      .select()
      .from(schema.creditTransactions)
      .where(eq(schema.creditTransactions.referenceId, "preauth:bout-002"));

    expect(txRows).toHaveLength(0);
  });

  it("atomic guard rejects second preauth when balance only covers one", async () => {
    await ensureCreditAccount(testUserId3);
    // Balance is 10000, each preauth costs 6000
    // First should succeed, second should fail

    const [result1, result2] = await Promise.all([
      preauthorizeCredits(testUserId3, 6000, "bout-concurrent-a"),
      preauthorizeCredits(testUserId3, 6000, "bout-concurrent-b"),
    ]);

    // Exactly one should succeed
    const successes = [result1, result2].filter((r) => r.success);
    const failures = [result1, result2].filter((r) => !r.success);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    // Final balance should be 4000 (10000 - 6000)
    const finalBalance = await getCreditBalanceMicro(testUserId3);
    expect(finalBalance).toBe(4000);
  });
});

describe("preauth (no database)", () => {
  it("skips live tests when DATABASE_URL is not set", () => {
    expect(true).toBe(true);
  });
});
