// Global daily free-bout pool -- shared across all free-tier users.
//
// Hard-caps the platform's daily API spend on free-tier users. When the
// pool is exhausted, free users see a message to upgrade or wait until
// tomorrow. Paid subscribers are never affected.
//
// Uses an atomic SQL update to prevent race conditions on concurrent
// bout starts, modeled after the intro-pool pattern.

import { eq, sql } from 'drizzle-orm';

import { requireDb } from '@/db';
import { freeBoutPool } from '@/db/schema';

export const FREE_BOUT_POOL_MAX = Number(
  process.env.FREE_BOUT_POOL_MAX ?? '500',
);

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
    return raced!;
  }

  return created;
}

export type FreeBoutPoolStatus = {
  used: number;
  max: number;
  remaining: number;
  exhausted: boolean;
  date: string;
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
  };
}

/**
 * Atomically consume one bout from the global free pool.
 *
 * Uses a conditional UPDATE that only increments `used` if the pool
 * has capacity, preventing race conditions where concurrent requests
 * could exceed the daily cap.
 *
 * @returns { consumed: true } if successful, or { consumed: false, remaining: 0 }
 *          if the pool is exhausted.
 */
export async function consumeFreeBout(): Promise<
  { consumed: true; remaining: number } | { consumed: false; remaining: number }
> {
  const pool = await ensureTodayPool();
  const db = requireDb();

  // Atomic conditional update: only increment if used < maxDaily
  const [result] = await db
    .update(freeBoutPool)
    .set({
      used: sql`${freeBoutPool.used} + 1`,
      updatedAt: new Date(),
    })
    .where(
      sql`${freeBoutPool.date} = ${pool.date} AND ${freeBoutPool.used} < ${freeBoutPool.maxDaily}`,
    )
    .returning({ used: freeBoutPool.used, maxDaily: freeBoutPool.maxDaily });

  if (!result) {
    // Update didn't match -- pool is exhausted
    return { consumed: false, remaining: 0 };
  }

  const remaining = Math.max(0, result.maxDaily - result.used);
  return { consumed: true, remaining };
}
