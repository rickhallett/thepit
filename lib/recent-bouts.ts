// Paginated listing of recently completed bouts for the public feed.

import { desc, eq, sql } from 'drizzle-orm';

import { requireDb } from '@/db';
import { bouts, reactions } from '@/db/schema';
import type { TranscriptEntry, ArenaAgent } from '@/db/schema';
import { getPresetById, ARENA_PRESET_ID } from '@/lib/presets';

export type RecentBout = {
  id: string;
  presetId: string;
  presetName: string;
  topic: string | null;
  agentNames: string[];
  shareLine: string | null;
  turnCount: number;
  reactionCount: number;
  createdAt: Date;
};

/**
 * Fetch a page of recently completed bouts, most recent first.
 * Includes aggregate reaction count per bout.
 */
export async function getRecentBouts(
  limit = 20,
  offset = 0,
): Promise<RecentBout[]> {
  const db = requireDb();

  // Aggregate reaction counts in a subquery, then LEFT JOIN to avoid
  // a correlated subquery that runs per-row (N+1).
  const reactionCounts = db
    .select({
      boutId: reactions.boutId,
      count: sql<number>`cast(count(*) as int)`.as('reaction_count'),
    })
    .from(reactions)
    .groupBy(reactions.boutId)
    .as('rc');

  const rows = await db
    .select({
      id: bouts.id,
      presetId: bouts.presetId,
      topic: bouts.topic,
      agentLineup: bouts.agentLineup,
      transcript: bouts.transcript,
      shareLine: bouts.shareLine,
      createdAt: bouts.createdAt,
      reactionCount: sql<number>`coalesce(${reactionCounts.count}, 0)`,
    })
    .from(bouts)
    .leftJoin(reactionCounts, eq(bouts.id, reactionCounts.boutId))
    .where(eq(bouts.status, 'completed'))
    .orderBy(desc(bouts.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => {
    const preset = getPresetById(row.presetId);
    const lineup = row.agentLineup as ArenaAgent[] | null;
    const transcript = row.transcript as TranscriptEntry[] | null;

    let agentNames: string[];
    if (row.presetId === ARENA_PRESET_ID && lineup?.length) {
      agentNames = lineup.map((a) => a.name);
    } else if (preset) {
      agentNames = preset.agents.map((a) => a.name);
    } else {
      agentNames = [];
    }

    return {
      id: row.id,
      presetId: row.presetId,
      presetName: preset?.name ?? (row.presetId === ARENA_PRESET_ID ? 'Custom Arena' : row.presetId),
      topic: row.topic,
      agentNames,
      shareLine: row.shareLine,
      turnCount: transcript?.length ?? 0,
      reactionCount: Number(row.reactionCount) || 0,
      createdAt: row.createdAt,
    };
  });
}
