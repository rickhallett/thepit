import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { SignedOut } from '@clerk/nextjs';
import Link from 'next/link';

import { Arena } from '@/components/arena';
import { BoutHero } from '@/components/bout-hero';
import { TrackPageEvent } from '@/components/track-page-event';
import { requireDb } from '@/db';
import { bouts, type TranscriptEntry } from '@/db/schema';
import { getCopy } from '@/lib/copy';
import { getPresetById, ARENA_PRESET_ID } from '@/lib/presets';
import { buildArenaPresetFromLineup } from '@/lib/bout-lineup';
import { getReactionCounts, getMostReactedTurnIndex, getUserReactions } from '@/lib/reactions';
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

  const preset = bout.presetId ? getPresetById(bout.presetId) : undefined;
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

  let preset = bout.presetId ? getPresetById(bout.presetId) : undefined;
  if (!preset && bout.presetId === ARENA_PRESET_ID && bout.agentLineup) {
    preset = buildArenaPresetFromLineup(bout.agentLineup, bout.maxTurns);
  }
  if (!preset) {
    notFound();
  }

  const [reactionCounts, userReactionKeys, winnerVoteCounts, userWinnerVote, mostReactedTurn] = await Promise.all([
    getReactionCounts(resolved.id),
    userId ? getUserReactions(resolved.id, userId) : Promise.resolve([]),
    getWinnerVoteCounts(resolved.id),
    userId ? getUserWinnerVote(resolved.id, userId) : Promise.resolve(null),
    getMostReactedTurnIndex(resolved.id),
  ]);

  // Track replay views — any visitor viewing a bout they didn't create.
  // Anonymous replays are included to measure the viral/sharing funnel
  // (users who arrive via shared links before signing up).
  const isReplay = !userId || bout.ownerId !== userId;

  const transcript = (bout.transcript ?? []) as TranscriptEntry[];

  return (
    <>
      {isReplay && <TrackPageEvent event="bout_replayed" properties={{ bout_id: resolved.id, preset_id: bout.presetId }} />}
      <BoutHero
        presetName={preset.name}
        agents={preset.agents.map((a) => ({ name: a.name, color: a.color }))}
        shareLine={bout.shareLine}
        transcript={transcript}
        mostReactedTurn={mostReactedTurn ? {
          turnIndex: mostReactedTurn.turnIndex,
          heartCount: mostReactedTurn.heartCount,
          fireCount: mostReactedTurn.fireCount,
        } : null}
      />
      <Arena
        boutId={resolved.id}
        preset={preset}
        initialTranscript={transcript}
        shareLine={bout.shareLine}
        format={bout.responseFormat ?? null}
        length={bout.responseLength ?? null}
        topic={bout.topic ?? null}
        initialReactions={reactionCounts}
        initialUserReactions={userReactionKeys}
        initialWinnerVotes={winnerVoteCounts}
        initialUserVote={userWinnerVote}
      />
      <SignedOut>
        <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-accent/60 bg-accent px-4 py-3 text-center">
          <Link
            href="/sign-up?redirect_url=/arena"
            className="text-sm font-semibold uppercase tracking-[0.3em] text-background transition hover:opacity-80"
          >
            Create your own battle
          </Link>
        </div>
      </SignedOut>
    </>
  );
}
