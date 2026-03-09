/**
 * settlement.test.ts — settlement and refund tests against a real database.
 *
 * Tests delta reconciliation logic for over/under estimates and error refunds.
 * Skips gracefully when DATABASE_URL is not set.
 *
 * @vitest-environment node
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("settleCredits (live database)", () => {
  let db: Awaited<typeof import("@/db")>["db"];
  let schema: Awaited<typeof import("@/db/schema")>;
  let settleCredits: Awaited<typeof import("./settlement")>["settleCredits"];
  let refundPreauth: Awaited<typeof import("./settlement")>["refundPreauth"];
  let ensureCreditAccount: Awaited<
    typeof import("./balance")
  >["ensureCreditAccount"];
  let applyCreditDelta: Awaited<
    typeof import("./balance")
  >["applyCreditDelta"];
  let CreditSource: Awaited<typeof import("./types")>["CreditSource"];
  let eq: Awaited<typeof import("drizzle-orm")>["eq"];

  const testPrefix = `test-settle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const testUserOver = `${testPrefix}-over`;
  const testUserUnder = `${testPrefix}-under`;
  const testUserExact = `${testPrefix}-exact`;
  const testUserRefund = `${testPrefix}-refund`;

  beforeAll(async () => {
    const { neonConfig } = await import("@neondatabase/serverless");
    const ws = await import("ws");
    neonConfig.webSocketConstructor = ws.default;

    const drizzleOrm = await import("drizzle-orm");
    eq = drizzleOrm.eq;
    schema = await import("@/db/schema");
    db = (await import("@/db")).db;
    const settlementModule = await import("./settlement");
    settleCredits = settlementModule.settleCredits;
    refundPreauth = settlementModule.refundPreauth;
    const balanceModule = await import("./balance");
    ensureCreditAccount = balanceModule.ensureCreditAccount;
    applyCreditDelta = balanceModule.applyCreditDelta;
    CreditSource = (await import("./types")).CreditSource;

    // Create test users
    for (const id of [testUserOver, testUserUnder, testUserExact, testUserRefund]) {
      await db
        .insert(schema.users)
        .values({ id, email: `${id}@test.com` })
        .onConflictDoNothing();
    }
  });

  afterAll(async () => {
    if (db && schema) {
      for (const id of [testUserOver, testUserUnder, testUserExact, testUserRefund]) {
        await db
          .delete(schema.creditTransactions)
          .where(eq(schema.creditTransactions.userId, id));
        await db.delete(schema.credits).where(eq(schema.credits.userId, id));
        await db.delete(schema.users).where(eq(schema.users.id, id));
      }
    }
  });

  it("overestimate: refunds the difference", async () => {
    await ensureCreditAccount(testUserOver);
    // Simulate preauth of 5000 (balance now 5000)
    await applyCreditDelta(testUserOver, -5000, CreditSource.PREAUTH, `preauth:bout-over`);

    // Settle with actual = 3000 (overestimated by 2000)
    const result = await settleCredits(testUserOver, "bout-over", 3000, 5000);

    expect(result.adjustmentMicro).toBe(2000); // positive = refund
    expect(result.finalBalance).toBe(7000); // 5000 + 2000
  });

  it("underestimate: charges additional (capped at available)", async () => {
    await ensureCreditAccount(testUserUnder);
    // Simulate preauth of 3000 (balance now 7000)
    await applyCreditDelta(testUserUnder, -3000, CreditSource.PREAUTH, `preauth:bout-under`);

    // Settle with actual = 5000 (underestimated by 2000)
    const result = await settleCredits(testUserUnder, "bout-under", 5000, 3000);

    expect(result.adjustmentMicro).toBe(-2000); // negative = additional charge
    expect(result.finalBalance).toBe(5000); // 7000 - 2000
  });

  it("underestimate: caps charge at available balance", async () => {
    // Set balance to exactly 1000 remaining
    await ensureCreditAccount(testUserUnder);
    // Current balance from previous test is 5000, drain to 1000
    await applyCreditDelta(testUserUnder, -4000, CreditSource.PREAUTH, `preauth:bout-drain`);

    // Settle with actual = 3000, estimated = 0 (underestimate of 3000, but only 1000 available)
    const result = await settleCredits(testUserUnder, "bout-cap", 3000, 0);

    expect(result.adjustmentMicro).toBe(-1000); // capped at available
    expect(result.finalBalance).toBe(0);
  });

  it("exact: zero adjustment, still logs transaction", async () => {
    await ensureCreditAccount(testUserExact);
    // Simulate preauth of 5000 (balance now 5000)
    await applyCreditDelta(testUserExact, -5000, CreditSource.PREAUTH, `preauth:bout-exact`);

    const result = await settleCredits(testUserExact, "bout-exact", 5000, 5000);

    expect(result.adjustmentMicro).toBe(0);
    expect(result.finalBalance).toBe(5000); // unchanged

    // Verify transaction was logged
    const txRows = await db
      .select()
      .from(schema.creditTransactions)
      .where(eq(schema.creditTransactions.referenceId, "settle:bout-exact"));

    expect(txRows).toHaveLength(1);
    expect(txRows[0].deltaMicro).toBe(0);
    expect(txRows[0].source).toBe("settlement");
  });

  it("settlement logs a transaction with source='settlement'", async () => {
    const txRows = await db
      .select()
      .from(schema.creditTransactions)
      .where(eq(schema.creditTransactions.referenceId, "settle:bout-over"));

    expect(txRows).toHaveLength(1);
    expect(txRows[0].source).toBe("settlement");
    expect(txRows[0].deltaMicro).toBe(2000);
  });
});

describe.skipIf(!hasDb)("refundPreauth (live database)", () => {
  let db: Awaited<typeof import("@/db")>["db"];
  let schema: Awaited<typeof import("@/db/schema")>;
  let refundPreauth: Awaited<typeof import("./settlement")>["refundPreauth"];
  let ensureCreditAccount: Awaited<
    typeof import("./balance")
  >["ensureCreditAccount"];
  let applyCreditDelta: Awaited<
    typeof import("./balance")
  >["applyCreditDelta"];
  let CreditSource: Awaited<typeof import("./types")>["CreditSource"];
  let eq: Awaited<typeof import("drizzle-orm")>["eq"];

  const testPrefix = `test-refund-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const testUserRefund = `${testPrefix}-full`;

  beforeAll(async () => {
    const { neonConfig } = await import("@neondatabase/serverless");
    const ws = await import("ws");
    neonConfig.webSocketConstructor = ws.default;

    const drizzleOrm = await import("drizzle-orm");
    eq = drizzleOrm.eq;
    schema = await import("@/db/schema");
    db = (await import("@/db")).db;
    refundPreauth = (await import("./settlement")).refundPreauth;
    const balanceModule = await import("./balance");
    ensureCreditAccount = balanceModule.ensureCreditAccount;
    applyCreditDelta = balanceModule.applyCreditDelta;
    CreditSource = (await import("./types")).CreditSource;

    await db
      .insert(schema.users)
      .values({ id: testUserRefund, email: `${testUserRefund}@test.com` })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    if (db && schema) {
      await db
        .delete(schema.creditTransactions)
        .where(eq(schema.creditTransactions.userId, testUserRefund));
      await db.delete(schema.credits).where(eq(schema.credits.userId, testUserRefund));
      await db.delete(schema.users).where(eq(schema.users.id, testUserRefund));
    }
  });

  it("restores full preauth amount", async () => {
    await ensureCreditAccount(testUserRefund);
    // Simulate preauth of 6000 (balance now 4000)
    await applyCreditDelta(testUserRefund, -6000, CreditSource.PREAUTH, `preauth:bout-err`);

    const newBalance = await refundPreauth(testUserRefund, "bout-err", 6000);

    expect(newBalance).toBe(10000); // fully restored
  });

  it("logs a transaction with source='refund'", async () => {
    const txRows = await db
      .select()
      .from(schema.creditTransactions)
      .where(eq(schema.creditTransactions.referenceId, "refund:bout-err"));

    expect(txRows).toHaveLength(1);
    expect(txRows[0].source).toBe("refund");
    expect(txRows[0].deltaMicro).toBe(6000);
  });
});

describe("settlement (no database)", () => {
  it("skips live tests when DATABASE_URL is not set", () => {
    expect(true).toBe(true);
  });
});
