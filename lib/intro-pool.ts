// Community intro credit pool — a shared pool of credits that decays via half-life.
//
// The pool starts at INTRO_POOL_TOTAL_CREDITS and decays exponentially:
//   remaining(t) = initial × 0.5^(t / halfLife) − claimed
//
// This creates honest, communal scarcity: compute costs money, the pool decays,
// sign up to keep going. No dark patterns, no fake countdown. The half-life
// mechanic is transparent and defensible to technical audiences.
//
// Claims (signup bonuses, referral bonuses, anonymous bouts) further reduce
// the pool. All claims use atomic SQL to prevent race conditions.

import { eq, sql } from 'drizzle-orm';

import { requireDb } from '@/db';
import { introPool } from '@/db/schema';
import { MICRO_PER_CREDIT, ensureCreditAccount, applyCreditDelta } from '@/lib/credits';

export const INTRO_POOL_TOTAL_CREDITS = Number(
  process.env.INTRO_POOL_TOTAL_CREDITS ?? '10000',
);
/** Half-life in days. Pool halves every N days via exponential decay. */
export const INTRO_POOL_HALF_LIFE_DAYS = Number(
  process.env.INTRO_POOL_HALF_LIFE_DAYS ?? '3',
);
export const INTRO_SIGNUP_CREDITS = Number(
  process.env.INTRO_SIGNUP_CREDITS ?? '0',
);
export const INTRO_REFERRAL_CREDITS = Number(
  process.env.INTRO_REFERRAL_CREDITS ?? '50',
);

/** Half-life in minutes. Used in TS for computeRemainingMicro.
 *  In SQL expressions, multiply by 60 to convert to seconds (EXTRACT EPOCH returns seconds). */
const HALF_LIFE_MINUTES = INTRO_POOL_HALF_LIFE_DAYS * 24 * 60;

const toMicro = (credits: number) =>
  Math.max(0, Math.round(credits * MICRO_PER_CREDIT));

type PoolSnapshot = {
  initialMicro: number;
  claimedMicro: number;
  startedAt: Date;
};

/**
 * Compute remaining credits using exponential half-life decay.
 * remaining = initial × 0.5^(elapsedMinutes / halfLifeMinutes) − claimed
 */
const computeRemainingMicro = (row: PoolSnapshot) => {
  const elapsedMs = Date.now() - row.startedAt.getTime();
  const elapsedMinutes = elapsedMs / 60000;
  const decayed = row.initialMicro * Math.pow(0.5, elapsedMinutes / HALF_LIFE_MINUTES);
  return Math.max(0, Math.floor(decayed) - row.claimedMicro);
};

export async function ensureIntroPool() {
  const db = requireDb();
  const [existing] = await db.select().from(introPool).limit(1);

  if (existing) return existing;

  // Race condition: multiple concurrent cold-start requests may all reach
  // this INSERT. We catch any error (including unique/constraint violations)
  // and re-select, guaranteeing exactly one pool row is returned.
  try {
    const [created] = await db
      .insert(introPool)
      .values({
        initialMicro: toMicro(INTRO_POOL_TOTAL_CREDITS),
        claimedMicro: 0,
        // Legacy column — decay is now computed via half-life, not linear drain.
        // Store 0 so any old linear computation returns initialMicro - claimed.
        drainRateMicroPerMinute: 0,
      })
      .returning();

    if (created) return created;
  } catch {
    // Another request likely inserted first — fall through to re-select
  }

  // Re-select: the winning request's row is now visible
  const [raceWinner] = await db.select().from(introPool).limit(1);
  if (!raceWinner) {
    throw new Error('Failed to create or find intro pool');
  }
  return raceWinner;
}

export async function getIntroPoolStatus() {
  const pool = await ensureIntroPool();
  const remainingMicro = computeRemainingMicro(pool);
  const remainingCredits = Math.floor(remainingMicro / MICRO_PER_CREDIT);
  return {
    remainingMicro,
    remainingCredits,
    halfLifeDays: INTRO_POOL_HALF_LIFE_DAYS,
    initialCredits: INTRO_POOL_TOTAL_CREDITS,
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
  // remaining = FLOOR(initial * 0.5^(elapsed_s / half_life_s)) - claimed
  // We use LEAST to cap the claim at what's actually available
  const [result] = await db
    .update(introPool)
    .set({
      claimedMicro: sql`${introPool.claimedMicro} + LEAST(
        ${requestedMicro},
        GREATEST(
          0,
          FLOOR(${introPool.initialMicro} * POWER(0.5, EXTRACT(EPOCH FROM (NOW() - ${introPool.startedAt})) / ${HALF_LIFE_MINUTES * 60}))
          - ${introPool.claimedMicro}
        )
      )`,
      updatedAt: new Date(),
    })
    .where(eq(introPool.id, pool.id))
    .returning({
      claimedMicro: introPool.claimedMicro,
      initialMicro: introPool.initialMicro,
      startedAt: introPool.startedAt,
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

/**
 * Atomically consume credits from the intro pool for anonymous bouts.
 *
 * Unlike claimIntroCredits, this does not credit a user account — it simply
 * deducts from the shared pool. Used for anonymous users during the intro
 * pool phase when authentication is not required.
 */
export async function consumeIntroPoolAnonymous(microCredits: number): Promise<{
  consumed: boolean;
  remainingMicro: number;
  exhausted: boolean;
}> {
  const db = requireDb();
  const pool = await ensureIntroPool();

  // Pre-check: is the pool likely exhausted?
  const preCheckRemaining = computeRemainingMicro(pool);
  if (preCheckRemaining < microCredits) {
    return { consumed: false, remainingMicro: preCheckRemaining, exhausted: preCheckRemaining <= 0 };
  }

  // Atomic consumption: only increment claimed if sufficient credits remain
  const [result] = await db
    .update(introPool)
    .set({
      claimedMicro: sql`${introPool.claimedMicro} + CASE
        WHEN (
          FLOOR(${introPool.initialMicro} * POWER(0.5, EXTRACT(EPOCH FROM (NOW() - ${introPool.startedAt})) / ${HALF_LIFE_MINUTES * 60}))
          - ${introPool.claimedMicro}
        ) >= ${microCredits}
        THEN ${microCredits}
        ELSE 0
      END`,
      updatedAt: new Date(),
    })
    .where(eq(introPool.id, pool.id))
    .returning({
      claimedMicro: introPool.claimedMicro,
      initialMicro: introPool.initialMicro,
      startedAt: introPool.startedAt,
    });

  if (!result) {
    return { consumed: false, remainingMicro: 0, exhausted: true };
  }

  const actualConsumed = result.claimedMicro - pool.claimedMicro;
  const newRemaining = computeRemainingMicro(result);

  return {
    consumed: actualConsumed >= microCredits,
    remainingMicro: newRemaining,
    exhausted: newRemaining <= 0,
  };
}

/**
 * Return credits to the intro pool after an anonymous bout fails.
 *
 * Atomically decrements claimedMicro so the credits become available again.
 * Uses GREATEST to prevent claimedMicro from going below zero in edge cases
 * (e.g. if a refund is accidentally issued twice).
 */
export async function refundIntroPool(microCredits: number): Promise<void> {
  if (microCredits <= 0) return;

  const db = requireDb();
  const pool = await ensureIntroPool();

  await db
    .update(introPool)
    .set({
      claimedMicro: sql`GREATEST(0, ${introPool.claimedMicro} - ${microCredits})`,
      updatedAt: new Date(),
    })
    .where(eq(introPool.id, pool.id));
}
