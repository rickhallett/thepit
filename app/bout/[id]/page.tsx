import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import { Arena } from '@/components/arena';
import { requireDb } from '@/db';
import { bouts, type TranscriptEntry } from '@/db/schema';
import {
  DEFAULT_PREMIUM_MODEL_ID,
  FREE_MODEL_ID,
  PREMIUM_MODEL_OPTIONS,
} from '@/lib/ai';
import {
  BYOK_ENABLED,
  CREDITS_ENABLED,
  estimateBoutCostGbp,
  formatCredits,
  toMicroCredits,
} from '@/lib/credits';
import { PRESETS } from '@/lib/presets';
import { resolveResponseLength } from '@/lib/response-lengths';

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
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
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
    console.error('Failed to load bout', error);
  }

  const resolvedPresetId = bout?.presetId ?? presetIdFromQuery;
  if (!resolvedPresetId) {
    notFound();
  }

  const preset = PRESETS.find((item) => item.id === resolvedPresetId);
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
        })
        .onConflictDoNothing();
    } catch (error) {
      console.error('Failed to backfill bout', error);
    }
  }

  const transcript = (bout?.transcript ?? []) as TranscriptEntry[];
  const premiumEnabled = process.env.PREMIUM_ENABLED === 'true';
  const requestedModel =
    typeof modelFromQuery === 'string' ? modelFromQuery.trim() : '';
  let modelId = FREE_MODEL_ID;
  if (preset.tier === 'premium' && premiumEnabled) {
    modelId = PREMIUM_MODEL_OPTIONS.includes(requestedModel)
      ? requestedModel
      : DEFAULT_PREMIUM_MODEL_ID;
  } else if (requestedModel === 'byok' && BYOK_ENABLED) {
    modelId = 'byok';
  }
  const lengthConfig = resolveResponseLength(lengthFromQuery);
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

  return (
    <Arena
      boutId={resolvedParams.id}
      preset={preset}
      topic={topicFromQuery}
      model={modelFromQuery}
      length={lengthFromQuery}
      format={formatFromQuery}
      estimatedCredits={estimatedCredits}
      initialTranscript={transcript}
    />
  );
}
