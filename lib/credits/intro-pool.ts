// Intro pool — shared credit pool for anonymous users with half-life decay.
// Creates urgency: the pool shrinks over time even without claims.

import { db } from "@/db";
import { introPool } from "@/db/schema";
import { sql } from "drizzle-orm";
import { applyCreditDelta } from "./balance";
import { CreditSource } from "./types";

const DEFAULT_INITIAL_MICRO = 1000000;
const DEFAULT_HALF_LIFE_DAYS = 3;

/**
 * Ensures the intro pool singleton exists.
 * Idempotent — safe to call multiple times.
 */
export async function ensureIntroPool(): Promise<void> {
  await db
    .insert(introPool)
    .values({
      initialMicro: DEFAULT_INITIAL_MICRO,
      claimedMicro: 0,
      halfLifeDays: String(DEFAULT_HALF_LIFE_DAYS),
    })
    .onConflictDoNothing();
}

export interface IntroPoolStatus {
  initialMicro: number;
  claimedMicro: number;
  effectiveRemainingMicro: number;
  halfLifeDays: number;
  createdAt: Date;
}

/**
 * Returns the current status of the intro pool including effective remaining after decay.
 */
export async function getIntroPoolStatus(): Promise<IntroPoolStatus> {
  const rows = await db
    .select({
      initialMicro: introPool.initialMicro,
      claimedMicro: introPool.claimedMicro,
      halfLifeDays: introPool.halfLifeDays,
      createdAt: introPool.createdAt,
      // Compute effective remaining with decay formula
      effectiveRemaining: sql<number>`
        GREATEST(0,
          ${introPool.initialMicro} *
          power(0.5, EXTRACT(EPOCH FROM (now() - ${introPool.createdAt})) / (${introPool.halfLifeDays}::numeric * 86400))
          - ${introPool.claimedMicro}
        )
      `.mapWith(Number),
    })
    .from(introPool)
    .limit(1);

  if (rows.length === 0) {
    // Pool doesn't exist yet — return empty state
    return {
      initialMicro: DEFAULT_INITIAL_MICRO,
      claimedMicro: 0,
      effectiveRemainingMicro: DEFAULT_INITIAL_MICRO,
      halfLifeDays: DEFAULT_HALF_LIFE_DAYS,
      createdAt: new Date(),
    };
  }

  const row = rows[0];
  return {
    initialMicro: row.initialMicro ?? DEFAULT_INITIAL_MICRO,
    claimedMicro: row.claimedMicro ?? 0,
    effectiveRemainingMicro: Math.floor(row.effectiveRemaining),
    halfLifeDays: parseFloat(row.halfLifeDays ?? String(DEFAULT_HALF_LIFE_DAYS)),
    createdAt: row.createdAt ?? new Date(),
  };
}

export interface ClaimResult {
  claimed: number;
  poolRemaining: number;
}

/**
 * Claims credits from the intro pool and credits them to a user.
 * Atomic: uses conditional UPDATE to prevent race conditions.
 *
 * @param userId - User to credit
 * @param requestedMicro - Amount requested in micro-credits
 * @returns Amount actually claimed and remaining pool
 */
export async function claimFromIntroPool(
  userId: string,
  requestedMicro: number,
): Promise<ClaimResult> {
  if (requestedMicro <= 0) {
    const status = await getIntroPoolStatus();
    return { claimed: 0, poolRemaining: status.effectiveRemainingMicro };
  }

  // Check available before attempting claim — guards against empty pool minting 0-credit claims
  // that still trigger the UPDATE and downstream applyCreditDelta.
  const preCheck = await getIntroPoolStatus();
  if (preCheck.effectiveRemainingMicro <= 0) {
    return { claimed: 0, poolRemaining: 0 };
  }

  // Atomic conditional update: claim up to min(requested, available).
  // LEAST + GREATEST in SQL ensures we never claim more than what's left.
  // RETURNING gives us the AFTER state; we compute actual claim from
  // oldClaimed (captured before) vs newClaimed (returned).
  const oldClaimedMicro = preCheck.claimedMicro;

  const result = await db
    .update(introPool)
    .set({
      claimedMicro: sql`${introPool.claimedMicro} + LEAST(
        ${requestedMicro},
        GREATEST(0,
          ${introPool.initialMicro} *
          power(0.5, EXTRACT(EPOCH FROM (now() - ${introPool.createdAt})) / (${introPool.halfLifeDays}::numeric * 86400))
          - ${introPool.claimedMicro}
        )
      )`,
    })
    .returning({
      claimedMicro: introPool.claimedMicro,
      initialMicro: introPool.initialMicro,
      halfLifeDays: introPool.halfLifeDays,
      createdAt: introPool.createdAt,
    });

  if (result.length === 0) {
    // Pool doesn't exist
    return { claimed: 0, poolRemaining: 0 };
  }

  const row = result[0];
  const newClaimedMicro = row.claimedMicro ?? 0;

  // Actual claim = difference between old and new claimedMicro.
  // This is the ground truth — no fragile JS recomputation of the SQL decay formula.
  // Capped at requestedMicro as a safety bound: if oldClaimedMicro is stale due to
  // a concurrent claim between getIntroPoolStatus and the UPDATE, the diff could
  // exceed the requested amount. The SQL LEAST ensures the pool deduction never
  // exceeds requestedMicro, so the credit grant shouldn't either.
  const actualClaim = Math.min(newClaimedMicro - oldClaimedMicro, requestedMicro);

  // Recompute effective remaining for the return value
  const halfLifeDays = parseFloat(row.halfLifeDays ?? String(DEFAULT_HALF_LIFE_DAYS));
  const initialMicro = row.initialMicro ?? DEFAULT_INITIAL_MICRO;
  const createdAt = row.createdAt ?? new Date();
  const elapsedSeconds = (Date.now() - createdAt.getTime()) / 1000;
  const decayFactor = Math.pow(0.5, elapsedSeconds / (halfLifeDays * 86400));
  const decayedTotal = initialMicro * decayFactor;
  const effectiveRemaining = Math.max(0, decayedTotal - newClaimedMicro);

  // Credit the user if we claimed anything
  if (actualClaim > 0) {
    const referenceId = `intro:${userId}`;
    await applyCreditDelta(userId, actualClaim, CreditSource.SIGNUP, referenceId, {
      source: "intro_pool",
    });
  }

  return {
    claimed: actualClaim,
    poolRemaining: Math.floor(effectiveRemaining),
  };
}

/**
 * Refunds credits back to the intro pool.
 * Used when a user's claim needs to be reversed.
 */
export async function refundIntroPool(amountMicro: number): Promise<void> {
  if (amountMicro <= 0) return;

  await db
    .update(introPool)
    .set({
      claimedMicro: sql`GREATEST(0, ${introPool.claimedMicro} - ${amountMicro})`,
    });
}
