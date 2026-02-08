import { eq, sql } from 'drizzle-orm';

import { requireDb } from '@/db';
import { introPool } from '@/db/schema';
import { MICRO_PER_CREDIT, ensureCreditAccount, applyCreditDelta } from '@/lib/credits';

export const INTRO_POOL_TOTAL_CREDITS = Number(
  process.env.INTRO_POOL_TOTAL_CREDITS ?? '15000',
);
export const INTRO_POOL_DRAIN_PER_MIN = Number(
  process.env.INTRO_POOL_DRAIN_PER_MIN ?? '1',
);
export const INTRO_SIGNUP_CREDITS = Number(
  process.env.INTRO_SIGNUP_CREDITS ?? '100',
);
export const INTRO_REFERRAL_CREDITS = Number(
  process.env.INTRO_REFERRAL_CREDITS ?? '50',
);

const toMicro = (credits: number) =>
  Math.max(0, Math.round(credits * MICRO_PER_CREDIT));

const computeRemainingMicro = (row: typeof introPool.$inferSelect) => {
  const elapsedMs = Date.now() - row.startedAt.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const drained = elapsedMinutes * row.drainRateMicroPerMinute;
  return Math.max(0, row.initialMicro - row.claimedMicro - drained);
};

export async function ensureIntroPool() {
  const db = requireDb();
  const [existing] = await db.select().from(introPool).limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(introPool)
    .values({
      initialMicro: toMicro(INTRO_POOL_TOTAL_CREDITS),
      claimedMicro: 0,
      drainRateMicroPerMinute: toMicro(INTRO_POOL_DRAIN_PER_MIN),
    })
    .returning();

  return created;
}

export async function getIntroPoolStatus() {
  const pool = await ensureIntroPool();
  const remainingMicro = computeRemainingMicro(pool);
  const remainingCredits = Math.floor(remainingMicro / MICRO_PER_CREDIT);
  return {
    remainingMicro,
    remainingCredits,
    drainRatePerMinute: INTRO_POOL_DRAIN_PER_MIN,
    startedAt: pool.startedAt.toISOString(),
    exhausted: remainingMicro <= 0,
  };
}

export async function claimIntroCredits(params: {
  userId: string;
  credits: number;
  source: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = requireDb();
  const pool = await ensureIntroPool();
  const remainingMicro = computeRemainingMicro(pool);
  const requestedMicro = toMicro(params.credits);
  const claimMicro = Math.min(remainingMicro, requestedMicro);

  if (claimMicro <= 0) {
    return { claimedMicro: 0, remainingMicro, exhausted: true };
  }

  await db
    .update(introPool)
    .set({
      claimedMicro: sql`${introPool.claimedMicro} + ${claimMicro}`,
      updatedAt: new Date(),
    })
    .where(eq(introPool.id, pool.id));

  await ensureCreditAccount(params.userId);
  await applyCreditDelta(params.userId, claimMicro, params.source, {
    referenceId: params.referenceId,
    introPoolClaimedMicro: claimMicro,
    introPoolRemainingMicro: remainingMicro - claimMicro,
    ...params.metadata,
  });

  return {
    claimedMicro: claimMicro,
    remainingMicro: Math.max(0, remainingMicro - claimMicro),
    exhausted: remainingMicro - claimMicro <= 0,
  };
}
