import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import { Arena } from '@/components/arena';
import { requireDb } from '@/db';
import { bouts, type TranscriptEntry } from '@/db/schema';
import { ALL_PRESETS, ARENA_PRESET_ID, DEFAULT_AGENT_COLOR, DEFAULT_ARENA_MAX_TURNS, type Agent } from '@/lib/presets';
import { getReactionCounts } from '@/lib/reactions';
import { getUserWinnerVote, getWinnerVoteCounts } from '@/lib/winner-votes';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}): Promise<Metadata> {
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
    return { title: 'Bout Not Found — THE PIT' };
  }

  const preset = ALL_PRESETS.find((p) => p.id === bout.presetId);
  const presetName = preset?.name ?? 'Arena Mode';
  const agents = preset?.agents.map((a) => a.name).join(' vs ') ?? '';
  const title = `${presetName} — THE PIT`;
  const description =
    bout.shareLine ??
    (agents ? `${agents} battle it out in The Pit.` : 'Watch the replay.');

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
      card: 'summary',
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

  const [reactionCounts, winnerVoteCounts, userWinnerVote] = await Promise.all([
    getReactionCounts(resolved.id),
    getWinnerVoteCounts(resolved.id),
    userId ? getUserWinnerVote(resolved.id, userId) : Promise.resolve(null),
  ]);

  return (
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
  );
}
