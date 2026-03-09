// Preauthorization — atomic credit reservation with insufficient funds rejection.
// Uses conditional UPDATE to ensure atomic check-and-deduct in single query.

import { db } from "@/db";
import { credits, creditTransactions } from "@/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import { CreditSource } from "./types";

export interface PreauthResult {
  success: boolean;
  newBalance: number;
  preauthId: string;
}

/**
 * Reserves credits for a bout. Fails atomically if balance is insufficient.
 *
 * The WHERE clause `balance_micro >= estimatedCostMicro` is the atomic guard —
 * it prevents two concurrent preauths from both succeeding if the balance
 * only covers one. If rows affected = 0, the preauth failed.
 */
export async function preauthorizeCredits(
  userId: string,
  estimatedCostMicro: number,
  boutId: string,
): Promise<PreauthResult> {
  // Guard: financial function validates its own invariants.
  // Zero allows a free bout; negative mints credits via subtraction inversion.
  if (estimatedCostMicro <= 0) {
    throw new Error(
      `Invalid preauth amount: estimatedCostMicro=${estimatedCostMicro}. Must be positive.`,
    );
  }

  const preauthId = `preauth:${boutId}`;

  // Transaction ensures the conditional deduction and audit log are atomic.
  // Without this, a failed INSERT leaves credits deducted with no audit trail.
  const txResult = await db.transaction(async (tx) => {
    // Atomic conditional deduction — only succeeds if balance >= cost
    const result = await tx
      .update(credits)
      .set({
        balanceMicro: sql`${credits.balanceMicro} - ${estimatedCostMicro}`,
      })
      .where(
        and(
          eq(credits.userId, userId),
          gte(credits.balanceMicro, estimatedCostMicro),
        ),
      )
      .returning({ balanceMicro: credits.balanceMicro });

    if (result.length === 0) {
      // WHERE clause rejected — insufficient funds or no account
      return { success: false as const };
    }

    const newBalance = result[0].balanceMicro ?? 0;

    // Log the preauth transaction
    await tx.insert(creditTransactions).values({
      userId,
      deltaMicro: -estimatedCostMicro,
      source: CreditSource.PREAUTH,
      referenceId: preauthId,
    });

    return { success: true as const, newBalance };
  });

  if (!txResult.success) {
    // Read balance outside transaction — no mutation to protect
    const currentBalance = await db
      .select({ balanceMicro: credits.balanceMicro })
      .from(credits)
      .where(eq(credits.userId, userId));

    return {
      success: false,
      newBalance: currentBalance[0]?.balanceMicro ?? 0,
      preauthId,
    };
  }

  return {
    success: true,
    newBalance: txResult.newBalance,
    preauthId,
  };
}
