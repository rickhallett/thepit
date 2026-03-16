// Bout sweep - identifies and recovers stuck bouts.
//
// Serverless function death (timeout, crash, OOM) between bout start and
// completion leaves bouts in 'running' status permanently. This sweep marks
// them as 'error', refunds preauthorized credits, and logs each incident
// for audit.
//
// Concurrency safety: uses atomic UPDATE ... WHERE status='running' RETURNING
// to claim each bout before refunding. A second concurrent sweep will get an
// empty RETURNING result and skip the refund.

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
  error?: string;
}

export interface SweepResult {
  swept: number;
  refunded: number;
  failed: number;
  details: SweepDetail[];
}

export async function sweepStuckBouts(
  thresholdMinutes = DEFAULT_STUCK_THRESHOLD_MINUTES,
): Promise<SweepResult> {
  const db = requireDb();

  // Compute cutoff in JS to avoid sql.raw injection surface.
  const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000);

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
  let failedCount = 0;

  for (const bout of stuckBouts) {
    try {
      // Atomic claim: only proceed if WE flip the status.
      // A concurrent sweep seeing the same bout will get an empty
      // RETURNING result and skip the refund entirely.
      const [claimed] = await db
        .update(bouts)
        .set({
          status: 'error',
          updatedAt: sql`NOW()`,
        })
        .where(
          and(
            eq(bouts.id, bout.id),
            eq(bouts.status, 'running'),
          ),
        )
        .returning();

      if (!claimed) {
        // Another sweep already claimed this bout - skip.
        continue;
      }

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
          if (preauth.deltaMicro >= 0) {
            log.warn('bout_sweep_unexpected_positive_delta', {
              boutId: bout.id,
              deltaMicro: preauth.deltaMicro,
            });
            // Skip refund - preauth should be a debit (negative delta).
            // Mark as error without refund so it surfaces for manual review.
          } else {
            const amount = Math.abs(preauth.deltaMicro);
            try {
              await applyCreditDelta(bout.ownerId, amount, 'sweep-refund', {
                referenceId: `sweep-refund:${bout.id}`,
                boutId: bout.id,
                reason: 'stuck-bout-sweep',
              });
              refundedMicro = amount;
              refundedCount++;
            } catch (refundErr) {
              // Refund failed - reset bout to 'running' so the next sweep
              // picks it up again. The atomic claim prevents double-refund
              // because we only reach here after successfully claiming.
              const refundMsg = refundErr instanceof Error
                ? refundErr.message
                : String(refundErr);
              log.error('bout_sweep_refund_failed', {
                boutId: bout.id,
                ownerId: bout.ownerId,
                error: refundMsg,
              });
              await db
                .update(bouts)
                .set({
                  status: 'running',
                  updatedAt: sql`NOW()`,
                })
                .where(eq(bouts.id, bout.id));
              failedCount++;
              details.push({
                boutId: bout.id,
                ownerId: bout.ownerId,
                createdAt: bout.createdAt,
                refundedMicro: 0,
                error: `refund failed: ${refundMsg}`,
              });
              continue;
            }
          }
        }
      }

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
    } catch (err) {
      failedCount++;
      const message = err instanceof Error ? err.message : String(err);
      log.error('bout_sweep_item_failed', {
        boutId: bout.id,
        error: message,
      });
      details.push({
        boutId: bout.id,
        ownerId: bout.ownerId,
        createdAt: bout.createdAt,
        refundedMicro: 0,
        error: message,
      });
    }
  }

  log.info('bout_sweep_complete', {
    swept: details.length - failedCount,
    refunded: refundedCount,
    failed: failedCount,
  });

  return {
    swept: details.length - failedCount,
    refunded: refundedCount,
    failed: failedCount,
    details,
  };
}
