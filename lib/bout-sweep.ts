// Bout sweep - identifies and recovers stuck bouts.
//
// Serverless function death (timeout, crash, OOM) between bout start and
// completion leaves bouts in 'running' status permanently. This sweep marks
// them as 'error', refunds preauthorized credits, and logs each incident
// for audit.

import { and, eq, lt, sql } from 'drizzle-orm';
import { requireDb } from '@/db';
import { bouts, creditTransactions } from '@/db/schema';
import { applyCreditDelta } from '@/lib/credits';
import { log } from '@/lib/logger';

const DEFAULT_STUCK_THRESHOLD_MINUTES = 15;

export interface SweepDetail {
  boutId: string;
  ownerId: string | null;
  createdAt: Date;
  refundedMicro: number;
}

export interface SweepResult {
  swept: number;
  refunded: number;
  details: SweepDetail[];
}

export async function sweepStuckBouts(
  thresholdMinutes = DEFAULT_STUCK_THRESHOLD_MINUTES,
): Promise<SweepResult> {
  const db = requireDb();

  const cutoff = sql`NOW() - INTERVAL '${sql.raw(String(thresholdMinutes))} minutes'`;

  const stuckBouts = await db
    .select()
    .from(bouts)
    .where(
      and(
        eq(bouts.status, 'running'),
        lt(bouts.createdAt, cutoff),
      ),
    );

  const details: SweepDetail[] = [];
  let refundedCount = 0;

  for (const bout of stuckBouts) {
    let refundedMicro = 0;

    // Refund preauth credits for user-owned bouts
    if (bout.ownerId) {
      const [preauth] = await db
        .select()
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.referenceId, bout.id),
            eq(creditTransactions.source, 'preauth'),
          ),
        )
        .limit(1);

      if (preauth) {
        const amount = Math.abs(preauth.deltaMicro);
        await applyCreditDelta(bout.ownerId, amount, 'sweep-refund', {
          referenceId: bout.id,
          boutId: bout.id,
          reason: 'stuck-bout-sweep',
        });
        refundedMicro = amount;
        refundedCount++;
      }
    }

    // Mark bout as error
    await db
      .update(bouts)
      .set({
        status: 'error',
        updatedAt: new Date(),
      })
      .where(eq(bouts.id, bout.id));

    log.audit('bout_sweep', {
      boutId: bout.id,
      ownerId: bout.ownerId,
      createdAt: bout.createdAt.toISOString(),
      refundedMicro,
    });

    details.push({
      boutId: bout.id,
      ownerId: bout.ownerId,
      createdAt: bout.createdAt,
      refundedMicro,
    });
  }

  log.info('bout_sweep_complete', {
    swept: details.length,
    refunded: refundedCount,
  });

  return {
    swept: details.length,
    refunded: refundedCount,
    details,
  };
}
