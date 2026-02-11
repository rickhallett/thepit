// Community intro credit pool -- a shared pool of credits that drains over time.
//
// Creates viral acquisition pressure: new users claim signup bonuses from the
// pool, and referrers earn bonus credits. The pool drains at a configurable
// rate per minute even without claims, creating urgency ("claim before it's gone").
// All claims use atomic SQL to prevent race conditions on concurrent signups.

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

type PoolSnapshot = {
  initialMicro: number;
  claimedMicro: number;
  drainRateMicroPerMinute: number;
  startedAt: Date;
};

const computeRemainingMicro = (row: PoolSnapshot) => {
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

/**
 * Atomically claim credits from the intro pool.
 *
 * Uses a conditional UPDATE that calculates remaining credits in SQL,
 * preventing race conditions where concurrent claims could overdraw the pool.
 */
export async function claimIntroCredits(params: {
  userId: string;
  credits: number;
  source: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = requireDb();
  const pool = await ensureIntroPool();
  const requestedMicro = toMicro(params.credits);

  // Pre-check: is the pool likely exhausted?
  const preCheckRemaining = computeRemainingMicro(pool);
  if (preCheckRemaining <= 0) {
    return { claimedMicro: 0, remainingMicro: 0, exhausted: true };
  }

  // Atomic claim: Calculate remaining in SQL and only increment if sufficient
  // The remaining calculation accounts for time-based drain
  // remaining = initial - claimed - (elapsed_minutes * drain_rate)
  //
  // We use LEAST to cap the claim at what's actually available
  const [result] = await db
    .update(introPool)
    .set({
      claimedMicro: sql`${introPool.claimedMicro} + LEAST(
        ${requestedMicro},
        GREATEST(
          0,
          ${introPool.initialMicro} - ${introPool.claimedMicro} -
          (EXTRACT(EPOCH FROM (NOW() - ${introPool.startedAt})) / 60)::bigint * ${introPool.drainRateMicroPerMinute}
        )
      )`,
      updatedAt: new Date(),
    })
    .where(eq(introPool.id, pool.id))
    .returning({
      claimedMicro: introPool.claimedMicro,
      initialMicro: introPool.initialMicro,
      startedAt: introPool.startedAt,
      drainRateMicroPerMinute: introPool.drainRateMicroPerMinute,
    });

  if (!result) {
    // Pool doesn't exist - shouldn't happen since we called ensureIntroPool
    return { claimedMicro: 0, remainingMicro: 0, exhausted: true };
  }

  // Calculate what was actually claimed (new claimed - old claimed)
  const actualClaimed = result.claimedMicro - pool.claimedMicro;
  const newRemaining = computeRemainingMicro(result);

  if (actualClaimed <= 0) {
    return { claimedMicro: 0, remainingMicro: newRemaining, exhausted: newRemaining <= 0 };
  }

  // Credit the user
  await ensureCreditAccount(params.userId);
  await applyCreditDelta(params.userId, actualClaimed, params.source, {
    referenceId: params.referenceId,
    introPoolClaimedMicro: actualClaimed,
    introPoolRemainingMicro: newRemaining,
    ...params.metadata,
  });

  return {
    claimedMicro: actualClaimed,
    remainingMicro: newRemaining,
    exhausted: newRemaining <= 0,
  };
}
