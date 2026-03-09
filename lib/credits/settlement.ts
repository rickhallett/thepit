// Settlement — reconciles estimated vs actual cost after bout completion.
// Handles overestimates (refund), underestimates (additional charge), and error refunds.

import { applyCreditDelta, getCreditBalanceMicro } from "./balance";
import { CreditSource } from "./types";

export interface SettlementResult {
  finalBalance: number;
  adjustmentMicro: number; // positive = refund, negative = additional charge
}

/**
 * Reconciles preauthorized amount with actual cost.
 *
 * - If estimated > actual: refund the difference
 * - If estimated < actual: charge additional (capped at available balance)
 * - If estimated === actual: log zero-delta transaction for audit trail
 */
export async function settleCredits(
  userId: string,
  boutId: string,
  actualCostMicro: number,
  estimatedCostMicro: number,
): Promise<SettlementResult> {
  // Guard: financial function validates its own invariants.
  // Negative values would invert the settlement direction, minting credits.
  if (actualCostMicro < 0 || estimatedCostMicro < 0) {
    throw new Error(
      `Invalid settlement amounts: actualCostMicro=${actualCostMicro}, estimatedCostMicro=${estimatedCostMicro}. Both must be non-negative.`,
    );
  }

  const referenceId = `settle:${boutId}`;

  // Positive delta = refund (overestimated), negative = additional charge (underestimated)
  const rawDelta = estimatedCostMicro - actualCostMicro;

  if (rawDelta >= 0) {
    // Overestimate or exact — refund the difference (or log zero-delta)
    const finalBalance = await applyCreditDelta(
      userId,
      rawDelta,
      CreditSource.SETTLEMENT,
      referenceId,
    );

    return {
      finalBalance,
      adjustmentMicro: rawDelta,
    };
  }

  // Underestimate — charge additional. GREATEST(0, ...) in applyCreditDelta
  // prevents negative balances at the SQL level. We read balance before and after
  // to compute the actual adjustment (which may differ from rawDelta if the floor
  // was hit). The TOCTOU between reads is bounded: it only affects the reported
  // adjustmentMicro, not the financial operation itself.
  const balanceBefore = await getCreditBalanceMicro(userId);

  const finalBalance = await applyCreditDelta(
    userId,
    rawDelta, // negative — applyCreditDelta's GREATEST(0,...) prevents going below zero
    CreditSource.SETTLEMENT,
    referenceId,
  );

  return {
    finalBalance,
    adjustmentMicro: finalBalance - balanceBefore,
  };
}

/**
 * Full refund of preauthorized amount on error paths.
 * Returns the new balance after refund.
 */
export async function refundPreauth(
  userId: string,
  boutId: string,
  preauthAmountMicro: number,
): Promise<number> {
  const referenceId = `refund:${boutId}`;

  return applyCreditDelta(
    userId,
    preauthAmountMicro,
    CreditSource.REFUND,
    referenceId,
  );
}
