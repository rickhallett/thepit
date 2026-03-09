// Credit balance operations — account creation, balance queries, atomic deltas.
// All amounts are in micro-credits (10000 micro = 100 display credits).

import { db } from "@/db";
import { credits, creditTransactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { CreditSource } from "./types";

const DEFAULT_BALANCE_MICRO = 10000; // 100 credits

/**
 * Creates a credit account for a user with the default starting balance.
 * Idempotent via ON CONFLICT DO NOTHING — safe to call multiple times.
 * Also logs a signup transaction (idempotent via reference_id check).
 */
export async function ensureCreditAccount(userId: string): Promise<void> {
  // Insert credit account — idempotent
  await db
    .insert(credits)
    .values({
      userId,
      balanceMicro: DEFAULT_BALANCE_MICRO,
    })
    .onConflictDoNothing({ target: credits.userId });

  // Log signup transaction — idempotent via unique constraint on reference_id.
  // ON CONFLICT DO NOTHING eliminates the TOCTOU race of SELECT-then-INSERT.
  const referenceId = `signup:${userId}`;
  await db
    .insert(creditTransactions)
    .values({
      userId,
      deltaMicro: DEFAULT_BALANCE_MICRO,
      source: CreditSource.SIGNUP,
      referenceId,
    })
    .onConflictDoNothing({ target: creditTransactions.referenceId });
}

/**
 * Returns the current balance in micro-credits for a user.
 * Returns 0 if no credit account exists.
 */
export async function getCreditBalanceMicro(userId: string): Promise<number> {
  const rows = await db
    .select({ balanceMicro: credits.balanceMicro })
    .from(credits)
    .where(eq(credits.userId, userId));

  if (rows.length === 0) {
    return 0;
  }

  return rows[0].balanceMicro ?? 0;
}

/**
 * Applies a credit delta (positive or negative) to a user's balance.
 * Uses GREATEST(0, balance + delta) to prevent negative balances.
 * Also logs the transaction.
 *
 * @returns The new balance after applying the delta.
 */
export async function applyCreditDelta(
  userId: string,
  delta: number,
  source: CreditSource,
  referenceId: string,
  metadata?: Record<string, unknown>,
): Promise<number> {
  // Transaction ensures balance update and audit log are atomic.
  // Without this, a failed INSERT leaves balance changed with no audit trail.
  return db.transaction(async (tx) => {
    // Read balance BEFORE update to compute actual applied delta.
    // GREATEST(0, ...) may floor the result, so requested delta ≠ applied delta.
    // FOR UPDATE locks the row to prevent concurrent reads between SELECT and UPDATE —
    // without this, two racing transactions both read the same oldBalance and log
    // incorrect actualDelta values (phantom ledger via race condition).
    const before = await tx
      .select({ balanceMicro: credits.balanceMicro })
      .from(credits)
      .where(eq(credits.userId, userId))
      .for("update");

    const oldBalance = before[0]?.balanceMicro ?? 0;

    // Update balance with floor at 0
    const result = await tx
      .update(credits)
      .set({
        balanceMicro: sql`GREATEST(0, ${credits.balanceMicro} + ${delta})`,
      })
      .where(eq(credits.userId, userId))
      .returning({ balanceMicro: credits.balanceMicro });

    const newBalance = result[0]?.balanceMicro ?? 0;

    // Log the ACTUAL applied delta, not the requested delta.
    // If balance was 1000 and delta was -5000, actual is -1000 (floored at 0).
    const actualDelta = newBalance - oldBalance;

    await tx.insert(creditTransactions).values({
      userId,
      deltaMicro: actualDelta,
      source,
      referenceId,
      metadata: metadata ?? null,
    });

    return newBalance;
  });
}
