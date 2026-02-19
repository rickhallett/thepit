import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import { Arena } from '@/components/arena';
import { db, requireDb } from '@/db';
import { bouts, type TranscriptEntry, type ArenaAgent } from '@/db/schema';
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
import { getCopy } from '@/lib/copy';
import { PRESETS, ARENA_PRESET_ID } from '@/lib/presets';
import { buildArenaPresetFromLineup } from '@/lib/bout-lineup';
import { resolveResponseLength } from '@/lib/response-lengths';
import { getReactionCounts } from '@/lib/reactions';
import { getUserWinnerVote, getWinnerVoteCounts } from '@/lib/winner-votes';

export const dynamic = 'force-dynamic';

type MetadataProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const c = await getCopy();
  const { id } = await params;

  let bout: (typeof bouts.$inferSelect) | null = null;
  if (db) {
    const [result] = await db
      .select()
      .from(bouts)
      .where(eq(bouts.id, id))
      .limit(1);
    bout = result ?? null;
  }

  const presetId = bout?.presetId;
  const preset = presetId ? PRESETS.find((p) => p.id === presetId) : null;
  const agentLineup = (bout?.agentLineup ?? []) as ArenaAgent[];

  // Build arena preset if needed
  const resolvedPreset =
    presetId === ARENA_PRESET_ID && agentLineup.length > 0
      ? buildArenaPresetFromLineup(agentLineup, bout?.maxTurns)
      : preset;

  const presetName = resolvedPreset?.name ?? 'AI Battle';
  const agentNames = resolvedPreset?.agents.map((a) => a.name).slice(0, 3) ?? [];
  const agentList =
    agentNames.length > 0
      ? agentNames.join(', ') + (resolvedPreset && resolvedPreset.agents.length > 3 ? ' & more' : '')
      : '';

  const title = `${presetName} ${c.meta.bout.titleSuffix}`;
  const description = agentList
    ? `${c.meta.bout.descriptionTemplate.replace('{agents}', agentList)} ${resolvedPreset?.description ?? ''}`
    : c.meta.bout.descriptionTemplate.replace('{agents}', 'AI agents');

  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description: description.slice(0, 160),
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@ThePitArena',
      creator: '@ThePitArena',
      title,
      description: description.slice(0, 160),
    },
  };
}

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
    preset = buildArenaPresetFromLineup(bout.agentLineup, bout.maxTurns);
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
