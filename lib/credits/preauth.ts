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
  const preauthId = `preauth:${boutId}`;

  // Atomic conditional deduction — only succeeds if balance >= cost
  const result = await db
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

  const newBalance = result[0].balanceMicro ?? 0;

  // Log the preauth transaction
  await db.insert(creditTransactions).values({
    userId,
    deltaMicro: -estimatedCostMicro,
    source: CreditSource.PREAUTH,
    referenceId: preauthId,
  });

  return {
    success: true,
    newBalance,
    preauthId,
  };
}
