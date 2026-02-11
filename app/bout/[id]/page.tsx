import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import { Arena } from '@/components/arena';
import { requireDb } from '@/db';
import { bouts, type TranscriptEntry } from '@/db/schema';
import {
  DEFAULT_PREMIUM_MODEL_ID,
  FREE_MODEL_ID,
  PREMIUM_MODEL_OPTIONS,
} from '@/lib/ai';
import { log } from '@/lib/logger';
import {
  BYOK_ENABLED,
  CREDITS_ENABLED,
  estimateBoutCostGbp,
  formatCredits,
  toMicroCredits,
} from '@/lib/credits';
import { PRESETS, DEFAULT_AGENT_COLOR, DEFAULT_ARENA_MAX_TURNS, ARENA_PRESET_ID, type Agent } from '@/lib/presets';
import { resolveResponseLength } from '@/lib/response-lengths';
import { getReactionCounts } from '@/lib/reactions';
import { getUserWinnerVote, getWinnerVoteCounts } from '@/lib/winner-votes';

export const dynamic = 'force-dynamic';

export default async function BoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams?:
    | Promise<{
        presetId?: string;
        topic?: string;
        model?: string;
        length?: string;
        format?: string;
      }>
    | {
        presetId?: string;
        topic?: string;
        model?: string;
        length?: string;
        format?: string;
      };
}) {
  const db = requireDb();
  const [resolvedParams, resolvedSearchParams, { userId }] = await Promise.all([
    params,
    searchParams,
    auth(),
  ]);
  const presetIdFromQuery =
    typeof resolvedSearchParams?.presetId === 'string'
      ? resolvedSearchParams.presetId
      : null;
  const topicFromQuery =
    typeof resolvedSearchParams?.topic === 'string'
      ? resolvedSearchParams.topic
      : null;
  const modelFromQuery =
    typeof resolvedSearchParams?.model === 'string'
      ? resolvedSearchParams.model
      : null;
  const lengthFromQuery =
    typeof resolvedSearchParams?.length === 'string'
      ? resolvedSearchParams.length
      : null;
  const formatFromQuery =
    typeof resolvedSearchParams?.format === 'string'
      ? resolvedSearchParams.format
      : null;

  let bout: (typeof bouts.$inferSelect) | undefined;
  try {
    [bout] = await db
      .select()
      .from(bouts)
      .where(eq(bouts.id, resolvedParams.id))
      .limit(1);
  } catch (error) {
    log.error('Failed to load bout', error as Error, { boutId: resolvedParams.id });
  }

  const resolvedPresetId = bout?.presetId ?? presetIdFromQuery;
  if (!resolvedPresetId) {
    notFound();
  }

  let preset = PRESETS.find((item) => item.id === resolvedPresetId);
  if (!preset && resolvedPresetId === ARENA_PRESET_ID && bout?.agentLineup) {
    const lineup: Agent[] = bout.agentLineup.map((agent) => ({
      id: agent.id,
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      color: agent.color ?? DEFAULT_AGENT_COLOR,
      avatar: agent.avatar,
    }));
    preset = {
      id: ARENA_PRESET_ID,
      name: 'Arena Mode',
      description: 'Custom lineup',
      tier: 'free',
      maxTurns: DEFAULT_ARENA_MAX_TURNS,
      agents: lineup,
    };
  }
  if (!preset) {
    notFound();
  }

  if (!bout && resolvedPresetId) {
    try {
      await db
        .insert(bouts)
        .values({
          id: resolvedParams.id,
          presetId: resolvedPresetId,
          status: 'running',
          transcript: [],
          topic: topicFromQuery ?? null,
          responseLength: lengthFromQuery ?? null,
          responseFormat: formatFromQuery ?? null,
        })
        .onConflictDoNothing();
    } catch (error) {
      log.error('Failed to backfill bout', error as Error, { boutId: resolvedParams.id });
    }
  }

  const transcript = (bout?.transcript ?? []) as TranscriptEntry[];
  const shareLine = bout?.shareLine ?? null;
  const topic = bout?.topic ?? topicFromQuery;
  const length = bout?.responseLength ?? lengthFromQuery;
  const format = bout?.responseFormat ?? formatFromQuery;
  const premiumEnabled = process.env.PREMIUM_ENABLED === 'true';
  const requestedModel =
    typeof modelFromQuery === 'string' ? modelFromQuery.trim() : '';
  let modelId = FREE_MODEL_ID;
  const allowPremiumModels = preset.tier === 'premium' || preset.id === 'arena';
  if (allowPremiumModels && premiumEnabled) {
    modelId = PREMIUM_MODEL_OPTIONS.includes(requestedModel)
      ? requestedModel
      : DEFAULT_PREMIUM_MODEL_ID;
  } else if (requestedModel === 'byok' && BYOK_ENABLED) {
    modelId = 'byok';
  }
  const lengthConfig = resolveResponseLength(length);
  const estimatedCredits =
    CREDITS_ENABLED && modelId
      ? formatCredits(
          toMicroCredits(
            estimateBoutCostGbp(
              preset.maxTurns,
              modelId,
              lengthConfig.outputTokensPerTurn,
            ),
          ),
        )
      : null;
  const [reactionCounts, winnerVoteCounts, userWinnerVote] = await Promise.all([
    getReactionCounts(resolvedParams.id),
    getWinnerVoteCounts(resolvedParams.id),
    userId ? getUserWinnerVote(resolvedParams.id, userId) : Promise.resolve(null),
  ]);

  return (
    <Arena
      boutId={resolvedParams.id}
      preset={preset}
      topic={topic}
      model={modelFromQuery}
      length={length}
      format={format}
      estimatedCredits={estimatedCredits}
      initialTranscript={transcript}
      shareLine={shareLine}
      initialReactions={reactionCounts}
      initialWinnerVotes={winnerVoteCounts}
      initialUserVote={userWinnerVote}
    />
  );
}
