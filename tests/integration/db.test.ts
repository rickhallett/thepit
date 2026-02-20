import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { nanoid } from 'nanoid';
import { eq, inArray, or } from 'drizzle-orm';

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
const describeIf = TEST_DB_URL ? describe : describe.skip;

let db: ReturnType<typeof import('@/db')['requireDb']> | null = null;
let schema: typeof import('@/db/schema') | null = null;
let originalPool: null | {
  id: number;
  initialMicro: number;
  claimedMicro: number;
  drainRateMicroPerMinute: number;
  startedAt: Date;
  updatedAt: Date;
} = null;
let poolWasCreated = false;
const testUserIds: string[] = [];

const resetIntroPool = async () => {
  if (!db || !schema) return;
  const { introPool } = schema;
  const [existing] = await db.select().from(introPool).limit(1);
  const now = new Date();
  const initialMicro = 1_500_000;
  if (!existing) {
    await db.insert(introPool).values({
      initialMicro,
      claimedMicro: 0,
      drainRateMicroPerMinute: 100,
      startedAt: now,
      updatedAt: now,
    });
    poolWasCreated = true;
    return;
  }
  originalPool = existing;
  await db
    .update(introPool)
    .set({
      initialMicro,
      claimedMicro: 0,
      drainRateMicroPerMinute: existing.drainRateMicroPerMinute,
      startedAt: now,
      updatedAt: now,
    })
    .where(eq(introPool.id, existing.id));
};

describeIf('db integration', () => {
  beforeAll(async () => {
    vi.resetModules();
    process.env.DATABASE_URL = TEST_DB_URL;
    const dbModule = await import('@/db');
    schema = await import('@/db/schema');
    db = dbModule.requireDb();
    await resetIntroPool();
  });

  afterAll(async () => {
    if (!db || !schema) return;
    const { introPool, creditTransactions, credits, referrals, users } = schema;

    if (testUserIds.length > 0) {
      await db
        .delete(creditTransactions)
        .where(inArray(creditTransactions.userId, testUserIds));
      await db
        .delete(referrals)
        .where(
          or(
            inArray(referrals.referrerId, testUserIds),
            inArray(referrals.referredId, testUserIds),
          ),
        );
      await db.delete(credits).where(inArray(credits.userId, testUserIds));
      await db.delete(users).where(inArray(users.id, testUserIds));
    }

    if (poolWasCreated) {
      await db.delete(introPool);
    } else if (originalPool) {
      await db
        .update(introPool)
        .set({
          initialMicro: originalPool.initialMicro,
          claimedMicro: originalPool.claimedMicro,
          drainRateMicroPerMinute: originalPool.drainRateMicroPerMinute,
          startedAt: originalPool.startedAt,
          updatedAt: originalPool.updatedAt,
        })
        .where(eq(introPool.id, originalPool.id));
    }
  });

  it('tracks credit ledger in the database', async () => {
    process.env.CREDITS_ENABLED = 'true';
    process.env.CREDITS_STARTING_CREDITS = '0';
    const { ensureCreditAccount, applyCreditDelta, getCreditBalanceMicro } =
      await import('@/lib/credits');

    const userId = `test-credit-${nanoid(6)}`;
    testUserIds.push(userId);

    const account = await ensureCreditAccount(userId);
    expect(account.balanceMicro).toBe(0);

    const updated = await applyCreditDelta(userId, 500, 'test', {
      referenceId: 'integration',
    });
    expect(updated!.balanceMicro).toBe(500);

    const balance = await getCreditBalanceMicro(userId);
    expect(balance).toBe(500);
  });

  it('returns intro pool status', async () => {
    const { getIntroPoolStatus } = await import('@/lib/intro-pool');
    const status = await getIntroPoolStatus();
    expect(status.remainingCredits).toBeGreaterThan(0);
    expect(status.exhausted).toBe(false);
  });

  it('awards referral credits', async () => {
    if (!db || !schema) return;
    const { users, referrals, creditTransactions } = schema;
    const { ensureReferralCode, applyReferralBonus } = await import(
      '@/lib/referrals'
    );

    const referrerId = `test-referrer-${nanoid(6)}`;
    const referredId = `test-referred-${nanoid(6)}`;
    testUserIds.push(referrerId, referredId);

    await db.insert(users).values({
      id: referrerId,
      email: `${referrerId}@pit.test`,
    });
    await db.insert(users).values({
      id: referredId,
      email: `${referredId}@pit.test`,
    });

    const code = await ensureReferralCode(referrerId);
    const result = await applyReferralBonus({ referredId, code });
    expect(result.status).toBe('credited');

    const [referralRow] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referredId, referredId))
      .limit(1);
    expect(referralRow?.credited).toBe(true);

    const [creditRow] = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, referrerId))
      .limit(1);
    expect(creditRow?.source).toBe('referral');
  });
});
