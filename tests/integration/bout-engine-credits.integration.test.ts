/**
 * Integration tests: bout-engine credit atomicity.
 *
 * Tests the credit preauth → settlement → refund paths with real Postgres.
 * These paths use `UPDATE ... WHERE balance >= est` which hides concurrency
 * bugs under mocks.
 *
 * Gated by TEST_DATABASE_URL — skips when unavailable (standard pattern).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { nanoid } from 'nanoid';
import { eq, inArray } from 'drizzle-orm';

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
const describeIf = TEST_DB_URL ? describe : describe.skip;

let db: ReturnType<typeof import('@/db')['requireDb']> | null = null;
let schema: typeof import('@/db/schema') | null = null;
let credits: typeof import('@/lib/credits') | null = null;
let introPool: typeof import('@/lib/intro-pool') | null = null;

const testUserIds: string[] = [];
const TEST_USER_PREFIX = 'test-bout-credits-';

describeIf('bout-engine credit atomicity (real Postgres)', () => {
  beforeAll(async () => {
    vi.resetModules();
    process.env.DATABASE_URL = TEST_DB_URL;

    const dbModule = await import('@/db');
    schema = await import('@/db/schema');
    credits = await import('@/lib/credits');
    introPool = await import('@/lib/intro-pool');
    db = dbModule.requireDb();
  });

  afterAll(async () => {
    if (!db || !schema) return;

    // Clean up test data
    if (testUserIds.length > 0) {
      await db
        .delete(schema.creditTransactions)
        .where(inArray(schema.creditTransactions.userId, testUserIds));
      await db
        .delete(schema.credits)
        .where(inArray(schema.credits.userId, testUserIds));
      await db
        .delete(schema.users)
        .where(inArray(schema.users.id, testUserIds));
    }
  });

  /** Create a test user with a given credit balance. */
  async function createTestUser(balanceMicro: number): Promise<string> {
    if (!db || !schema) throw new Error('DB not initialized');

    const userId = `${TEST_USER_PREFIX}${nanoid(8)}`;
    testUserIds.push(userId);

    // Insert user
    await db.insert(schema.users).values({
      id: userId,
      email: `${userId}@test.local`,
    }).onConflictDoNothing();

    // Insert credit balance
    await db.insert(schema.credits).values({
      userId,
      balanceMicro,
    }).onConflictDoNothing();

    return userId;
  }

  /** Get current balance for a user. */
  async function getBalance(userId: string): Promise<number> {
    if (!db || !schema) throw new Error('DB not initialized');
    const [row] = await db
      .select({ balanceMicro: schema.credits.balanceMicro })
      .from(schema.credits)
      .where(eq(schema.credits.userId, userId));
    return row?.balanceMicro ?? 0;
  }

  // I-01: Preauth deducts exact amount atomically
  it('I-01: preauth deducts exact amount atomically', async () => {
    if (!credits) throw new Error('Credits module not loaded');

    const userId = await createTestUser(100_000); // 100k micro-credits
    const preauthAmount = 5_000;

    const result = await credits.preauthorizeCredits(userId, preauthAmount, 'preauth', {
      boutId: 'integration-test-1',
      referenceId: 'integration-test-1',
    });

    expect(result.success).toBe(true);

    const balance = await getBalance(userId);
    expect(balance).toBe(100_000 - preauthAmount);
  });

  // I-02: Settlement refund: actual < preauth → balance increases
  it('I-02: settlement refund when actual < preauth', async () => {
    if (!credits) throw new Error('Credits module not loaded');

    const userId = await createTestUser(100_000);

    // Preauth 10,000
    await credits.preauthorizeCredits(userId, 10_000, 'preauth', {
      boutId: 'integration-test-2',
      referenceId: 'integration-test-2',
    });

    const afterPreauth = await getBalance(userId);
    expect(afterPreauth).toBe(90_000);

    // Settle: actual cost was only 6,000. Delta = 6000 - 10000 = -4000 (refund)
    await credits.settleCredits(userId, -4_000, 'settlement', {
      boutId: 'integration-test-2',
      referenceId: 'integration-test-2',
    });

    const afterSettle = await getBalance(userId);
    expect(afterSettle).toBe(94_000); // 90k + 4k refund
  });

  // I-03: Settlement charge: actual > preauth → balance decreases
  it('I-03: settlement charge when actual > preauth', async () => {
    if (!credits) throw new Error('Credits module not loaded');

    const userId = await createTestUser(100_000);

    // Preauth 5,000
    await credits.preauthorizeCredits(userId, 5_000, 'preauth', {
      boutId: 'integration-test-3',
      referenceId: 'integration-test-3',
    });

    const afterPreauth = await getBalance(userId);
    expect(afterPreauth).toBe(95_000);

    // Settle: actual cost was 8,000. Delta = 8000 - 5000 = 3000 (charge more)
    await credits.settleCredits(userId, 3_000, 'settlement', {
      boutId: 'integration-test-3',
      referenceId: 'integration-test-3',
    });

    const afterSettle = await getBalance(userId);
    expect(afterSettle).toBe(92_000); // 95k - 3k additional charge
  });

  // I-04: Error path refund via applyCreditDelta
  it('I-04: error path refund returns correct amount after partial bout', async () => {
    if (!credits) throw new Error('Credits module not loaded');

    const userId = await createTestUser(100_000);

    // Preauth 10,000
    await credits.preauthorizeCredits(userId, 10_000, 'preauth', {
      boutId: 'integration-test-4',
      referenceId: 'integration-test-4',
    });

    const afterPreauth = await getBalance(userId);
    expect(afterPreauth).toBe(90_000);

    // Error path: refund unused portion (7,000 back)
    await credits.applyCreditDelta(userId, 7_000, 'settlement-error', {
      boutId: 'integration-test-4',
      referenceId: 'integration-test-4',
    });

    const afterRefund = await getBalance(userId);
    expect(afterRefund).toBe(97_000); // 90k + 7k refund
  });

  // I-05: Intro pool consumption + refund round-trips correctly
  it('I-05: intro pool consumption and refund round-trips', async () => {
    if (!introPool || !db || !schema) throw new Error('Modules not loaded');

    // Get current pool state
    const [poolBefore] = await db
      .select()
      .from(schema.introPool)
      .limit(1);

    if (!poolBefore) {
      // Skip if no intro pool configured in test DB
      console.log('No intro pool in test DB — skipping I-05');
      return;
    }

    const claimedBefore = poolBefore.claimedMicro;
    const consumeAmount = 1_000;

    // Consume from pool
    const consumeResult = await introPool.consumeIntroPoolAnonymous(consumeAmount);

    if (!consumeResult.consumed) {
      // Pool exhausted — can't test round-trip. Not a failure.
      console.log('Intro pool exhausted — skipping I-05 round-trip');
      return;
    }

    // Verify claimed increased
    const [poolAfterConsume] = await db
      .select()
      .from(schema.introPool)
      .limit(1);
    expect(poolAfterConsume!.claimedMicro).toBe(claimedBefore + consumeAmount);

    // Refund
    await introPool.refundIntroPool(consumeAmount);

    // Verify claimed returned to original
    const [poolAfterRefund] = await db
      .select()
      .from(schema.introPool)
      .limit(1);
    expect(poolAfterRefund!.claimedMicro).toBe(claimedBefore);
  });
});
