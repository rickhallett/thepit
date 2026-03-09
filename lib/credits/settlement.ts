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

  // Underestimate — need to charge additional, capped at available balance
  const currentBalance = await getCreditBalanceMicro(userId);
  const additionalCharge = Math.min(-rawDelta, currentBalance);

  const finalBalance = await applyCreditDelta(
    userId,
    -additionalCharge,
    CreditSource.SETTLEMENT,
    referenceId,
  );

  return {
    finalBalance,
    adjustmentMicro: -additionalCharge,
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
