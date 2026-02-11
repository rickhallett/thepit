// Remix event recording and querying.
//
// Tracks when agents are cloned/remixed, capturing lineage, outcome,
// and optional reward payouts. Integrates with the credit economy
// via applyCreditDelta.

import { eq, sql } from 'drizzle-orm';

import { requireDb } from '@/db';
import { remixEvents, agents } from '@/db/schema';
import { log } from '@/lib/logger';
import { applyCreditDelta, CREDITS_ENABLED } from '@/lib/credits';

// Configurable reward amounts in micro-credits (env vars, default 0 = disabled)
export const REMIX_REWARD_REMIXER_MICRO = Number(
  process.env.REMIX_REWARD_REMIXER_MICRO ?? '0',
);
export const REMIX_REWARD_SOURCE_OWNER_MICRO = Number(
  process.env.REMIX_REWARD_SOURCE_OWNER_MICRO ?? '0',
);

export type RemixOutcome = 'completed' | 'failed';

/**
 * Record a remix event and optionally distribute credit rewards.
 *
 * Called after a successful agent clone (parentId is set). Looks up the
 * source agent's owner to determine reward recipients.
 *
 * Rewards are only distributed when:
 *   - CREDITS_ENABLED is true
 *   - reward env vars are > 0
 *   - source agent has an owner (preset agents have no owner)
 *   - outcome is 'completed'
 */
export async function recordRemixEvent({
  sourceAgentId,
  remixedAgentId,
  remixerUserId,
  outcome,
  reason,
  metadata,
}: {
  sourceAgentId: string;
  remixedAgentId: string | null;
  remixerUserId: string;
  outcome: RemixOutcome;
  reason?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ id: number; rewarded: boolean }> {
  const db = requireDb();

  // Look up source agent's owner for reward routing
  const [sourceAgent] = await db
    .select({ ownerId: agents.ownerId })
    .from(agents)
    .where(eq(agents.id, sourceAgentId))
    .limit(1);

  const sourceOwnerId = sourceAgent?.ownerId ?? null;

  // Calculate rewards
  const shouldReward =
    CREDITS_ENABLED &&
    outcome === 'completed' &&
    sourceOwnerId !== null &&
    sourceOwnerId !== remixerUserId; // don't reward self-clones

  const rewardRemixer = shouldReward ? REMIX_REWARD_REMIXER_MICRO : 0;
  const rewardSourceOwner = shouldReward
    ? REMIX_REWARD_SOURCE_OWNER_MICRO
    : 0;

  const [row] = await db
    .insert(remixEvents)
    .values({
      sourceAgentId,
      remixedAgentId,
      remixerUserId,
      sourceOwnerId,
      outcome,
      reason: reason ?? null,
      rewardRemixerMicro: rewardRemixer,
      rewardSourceOwnerMicro: rewardSourceOwner,
      metadata: metadata ?? {},
    })
    .returning({ id: remixEvents.id });

  // Distribute rewards (best-effort, non-blocking for the caller)
  if (shouldReward) {
    const refId = `remix-${row.id}`;
    const rewardMeta = { remixEventId: row.id, sourceAgentId, remixedAgentId };

    try {
      if (rewardRemixer > 0) {
        await applyCreditDelta(
          remixerUserId,
          rewardRemixer,
          'remix-reward-remixer',
          { ...rewardMeta, referenceId: refId },
        );
      }
      if (rewardSourceOwner > 0 && sourceOwnerId) {
        await applyCreditDelta(
          sourceOwnerId,
          rewardSourceOwner,
          'remix-reward-source-owner',
          { ...rewardMeta, referenceId: refId },
        );
      }
    } catch (err) {
      log.error(
        'Remix reward distribution failed',
        err instanceof Error ? err : new Error(String(err)),
        { remixEventId: row.id },
      );
    }
  }

  return { id: row.id, rewarded: shouldReward && (rewardRemixer > 0 || rewardSourceOwner > 0) };
}

/**
 * Get remix stats for an agent: how many times it has been remixed,
 * and total rewards earned by its owner from those remixes.
 */
export async function getRemixStats(
  agentId: string,
): Promise<{ remixCount: number; totalRewardsMicro: number }> {
  const db = requireDb();
  const [result] = await db
    .select({
      remixCount: sql<number>`count(*)::int`,
      totalRewardsMicro: sql<number>`coalesce(sum(${remixEvents.rewardSourceOwnerMicro}), 0)::int`,
    })
    .from(remixEvents)
    .where(eq(remixEvents.sourceAgentId, agentId));

  return {
    remixCount: result?.remixCount ?? 0,
    totalRewardsMicro: result?.totalRewardsMicro ?? 0,
  };
}
