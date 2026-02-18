import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import { Arena } from '@/components/arena';
import { TrackPageEvent } from '@/components/track-page-event';
import { requireDb } from '@/db';
import { bouts, type TranscriptEntry } from '@/db/schema';
import { getCopy } from '@/lib/copy';
import { ALL_PRESETS, ARENA_PRESET_ID } from '@/lib/presets';
import { buildArenaPresetFromLineup } from '@/lib/bout-lineup';
import { getReactionCounts } from '@/lib/reactions';
import { getUserWinnerVote, getWinnerVoteCounts } from '@/lib/winner-votes';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}): Promise<Metadata> {
  const c = await getCopy();
  const db = requireDb();
  const resolved = await params;
  const [bout] = await db
    .select({
      presetId: bouts.presetId,
      shareLine: bouts.shareLine,
      topic: bouts.topic,
    })
    .from(bouts)
    .where(eq(bouts.id, resolved.id))
    .limit(1);

  if (!bout) {
    return { title: c.meta.bout.notFoundTitle };
  }

  const preset = ALL_PRESETS.find((p) => p.id === bout.presetId);
  const presetName = preset?.name ?? 'Arena Mode';
  const agents = preset?.agents.map((a) => a.name).join(' vs ') ?? '';
  const title = `${presetName} ${c.meta.bout.titleSuffix}`;
  const description =
    bout.shareLine ??
    (agents ? c.meta.shortLink.descriptionTemplate.replace('{agents}', agents) : c.meta.shortLink.fallbackDescription);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'THE PIT',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@ThePitArena',
      creator: '@ThePitArena',
      title,
      description,
    },
  };
}

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const db = requireDb();
  const [resolved, { userId }] = await Promise.all([params, auth()]);
  const [bout] = await db
    .select()
    .from(bouts)
    .where(eq(bouts.id, resolved.id))
    .limit(1);

  if (!bout) {
    notFound();
  }

  let preset = ALL_PRESETS.find((item) => item.id === bout.presetId);
  if (!preset && bout.presetId === ARENA_PRESET_ID && bout.agentLineup) {
    preset = buildArenaPresetFromLineup(bout.agentLineup);
  }
  if (!preset) {
    notFound();
  }

  const [reactionCounts, winnerVoteCounts, userWinnerVote] = await Promise.all([
    getReactionCounts(resolved.id),
    getWinnerVoteCounts(resolved.id),
    userId ? getUserWinnerVote(resolved.id, userId) : Promise.resolve(null),
  ]);

  // Track replay views — only for authenticated users viewing bouts they didn't
  // create (i.e. shared bouts). Anonymous visitors are excluded to avoid
  // inflating the replay metric with bot/crawler traffic.
  const isReplay = !!userId && bout.ownerId !== userId;

  return (
    <>
      {isReplay && <TrackPageEvent event="bout_replayed" properties={{ boutId: resolved.id, presetId: bout.presetId }} />}
      <Arena
        boutId={resolved.id}
        preset={preset}
        initialTranscript={(bout.transcript ?? []) as TranscriptEntry[]}
        shareLine={bout.shareLine}
        format={bout.responseFormat ?? null}
        length={bout.responseLength ?? null}
        topic={bout.topic ?? null}
        initialReactions={reactionCounts}
        initialWinnerVotes={winnerVoteCounts}
        initialUserVote={userWinnerVote}
      />
    </>
  );
}
