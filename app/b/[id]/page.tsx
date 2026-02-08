import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import { Arena } from '@/components/arena';
import { requireDb } from '@/db';
import { bouts, type TranscriptEntry } from '@/db/schema';
import { ALL_PRESETS, type Agent } from '@/lib/presets';
import { getReactionCounts } from '@/lib/reactions';
import { getUserWinnerVote, getWinnerVoteCounts } from '@/lib/winner-votes';

export const dynamic = 'force-dynamic';

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const db = requireDb();
  const resolved = await params;
  const { userId } = await auth();
  const [bout] = await db
    .select()
    .from(bouts)
    .where(eq(bouts.id, resolved.id))
    .limit(1);

  if (!bout) {
    notFound();
  }

  let preset = ALL_PRESETS.find((item) => item.id === bout.presetId);
  if (!preset && bout.presetId === 'arena' && bout.agentLineup) {
    const lineup: Agent[] = bout.agentLineup.map((agent) => ({
      id: agent.id,
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      color: agent.color ?? '#f8fafc',
      avatar: agent.avatar,
    }));
    preset = {
      id: 'arena',
      name: 'Arena Mode',
      description: 'Custom lineup',
      tier: 'free',
      maxTurns: 12,
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
