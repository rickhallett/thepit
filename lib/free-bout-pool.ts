// Global daily free-bout pool -- shared across all free-tier users.
//
// Two independent caps protect platform spend:
//   1. **Bout count cap** (FREE_BOUT_POOL_MAX, default 500/day)
//      Limits the raw number of free bouts regardless of cost.
//   2. **Spend cap** (FREE_BOUT_DAILY_SPEND_CAP_GBP, default £20/day)
//      Limits cumulative GBP spend on free-tier bouts per day.
//
// Both are enforced atomically via conditional SQL UPDATEs to prevent
// race conditions on concurrent bout starts. Paid subscribers are
// never affected by either cap.
//
// Uses the same atomic pattern as the intro-pool.

import { eq, sql } from 'drizzle-orm';

import { requireDb } from '@/db';
import { freeBoutPool } from '@/db/schema';

export const FREE_BOUT_POOL_MAX = Number(
  process.env.FREE_BOUT_POOL_MAX ?? '500',
);

/** Daily GBP spend cap for the free tier. Default £20. */
export const FREE_BOUT_DAILY_SPEND_CAP_GBP = Number(
  process.env.FREE_BOUT_DAILY_SPEND_CAP_GBP ?? '20',
);

/**
 * Convert GBP to micro-credits for the spend cap.
 * 1 credit = £0.01, 1 micro = £0.0001.
 */
const MICRO_VALUE_GBP = 0.0001;
const spendCapMicro = Math.ceil(FREE_BOUT_DAILY_SPEND_CAP_GBP / MICRO_VALUE_GBP);

/** Get today's date as YYYY-MM-DD in UTC. */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Ensure a pool row exists for today. Creates one if missing.
 * Returns the current row.
 */
async function ensureTodayPool() {
  const db = requireDb();
  const date = todayUTC();

  const [existing] = await db
    .select()
    .from(freeBoutPool)
    .where(eq(freeBoutPool.date, date))
    .limit(1);

  if (existing) return existing;

  // Insert with ON CONFLICT to handle concurrent creates
  const [created] = await db
    .insert(freeBoutPool)
    .values({
      date,
      used: 0,
      maxDaily: FREE_BOUT_POOL_MAX,
      spendMicro: 0,
      spendCapMicro: spendCapMicro,
    })
    .onConflictDoNothing()
    .returning();

  // If onConflictDoNothing returned nothing, another request created it first
  if (!created) {
    const [raced] = await db
      .select()
      .from(freeBoutPool)
      .where(eq(freeBoutPool.date, date))
      .limit(1);
    if (!raced) {
      throw new Error(`Failed to ensure free bout pool row for ${date}`);
    }
    return raced;
  }

  return created;
}

export type FreeBoutPoolStatus = {
  used: number;
  max: number;
  remaining: number;
  exhausted: boolean;
  date: string;
  spendMicro: number;
  spendCapMicro: number;
  spendExhausted: boolean;
};

/**
 * Get the current status of today's free bout pool.
 */
export async function getFreeBoutPoolStatus(): Promise<FreeBoutPoolStatus> {
  const pool = await ensureTodayPool();
  const remaining = Math.max(0, pool.maxDaily - pool.used);
  return {
    used: pool.used,
    max: pool.maxDaily,
    remaining,
    exhausted: remaining <= 0,
    date: pool.date,
    spendMicro: pool.spendMicro,
    spendCapMicro: pool.spendCapMicro,
    spendExhausted: pool.spendMicro >= pool.spendCapMicro,
  };
}

/**
 * Atomically consume one bout from the global free pool and record
 * the estimated spend.
 *
 * Two conditions must both be satisfied for the UPDATE to succeed:
 *   1. used < maxDaily           (bout count cap)
 *   2. spendMicro + cost <= cap  (spend cap)
 *
 * @param estimatedCostMicro - Estimated bout cost in micro-credits.
 * @returns { consumed: true } if successful, or { consumed: false }
 *          with a reason if either cap is hit.
 */
export async function consumeFreeBout(
  estimatedCostMicro: number = 0,
): Promise<
  | { consumed: true; remaining: number }
  | { consumed: false; remaining: number; reason: 'count' | 'spend' }
> {
  const pool = await ensureTodayPool();
  const db = requireDb();

  // Atomic conditional update: increment count AND add spend, but only
  // if both the bout count cap and spend cap have headroom.
  const [result] = await db
    .update(freeBoutPool)
    .set({
      used: sql`${freeBoutPool.used} + 1`,
      spendMicro: sql`${freeBoutPool.spendMicro} + ${estimatedCostMicro}`,
      updatedAt: new Date(),
    })
    .where(
      sql`${freeBoutPool.date} = ${pool.date}
        AND ${freeBoutPool.used} < ${freeBoutPool.maxDaily}
        AND ${freeBoutPool.spendMicro} + ${estimatedCostMicro} <= ${freeBoutPool.spendCapMicro}`,
    )
    .returning({
      used: freeBoutPool.used,
      maxDaily: freeBoutPool.maxDaily,
      spendMicro: freeBoutPool.spendMicro,
      spendCapMicro: freeBoutPool.spendCapMicro,
    });

  if (!result) {
    // Determine which cap was hit for a helpful user message
    const reason: 'count' | 'spend' =
      pool.used >= pool.maxDaily ? 'count' : 'spend';
    return { consumed: false, remaining: 0, reason };
  }

  const remaining = Math.max(0, result.maxDaily - result.used);
  return { consumed: true, remaining };
}

/**
 * Settle actual spend on the free bout pool after a bout completes.
 * Adjusts spendMicro by the delta between actual and estimated cost.
 *
 * @param deltaMicro - Positive means underestimated (charge more),
 *                     negative means overestimated (refund).
 */
export async function settleFreeBoutSpend(deltaMicro: number): Promise<void> {
  if (deltaMicro === 0) return;
  const db = requireDb();
  const date = todayUTC();

  // Clamp to 0 to prevent negative spend totals on refunds
  await db
    .update(freeBoutPool)
    .set({
      spendMicro: sql`GREATEST(0, ${freeBoutPool.spendMicro} + ${deltaMicro})`,
      updatedAt: new Date(),
    })
    .where(eq(freeBoutPool.date, date));
}
