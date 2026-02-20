// Research dataset export generation.
//
// Aggregates completed bouts, reactions, votes, and agents into an
// anonymized JSON payload suitable for research consumption. Stored
// in the research_exports table with version metadata and summary stats.

import { eq, sql } from 'drizzle-orm';

import { requireDb } from '@/db';
import {
  bouts,
  reactions,
  winnerVotes,
  agents,
  researchExports,
  type TranscriptEntry,
} from '@/db/schema';
import { anonymizeUserId, anonymizeOwnerId } from '@/lib/research-anonymize';

export type ExportMetadata = {
  id: number;
  version: string;
  generatedAt: string;
  boutCount: number;
  reactionCount: number;
  voteCount: number;
  agentCount: number;
};

/**
 * Generate a research export and store it in the database.
 *
 * Queries all completed bouts with their reactions and votes,
 * anonymizes all user/owner IDs, and stores the payload as JSONB.
 */
export async function generateResearchExport(
  version: string,
): Promise<ExportMetadata> {
  const db = requireDb();

  // 1. Fetch completed bouts
  const boutRows = await db
    .select()
    .from(bouts)
    .where(eq(bouts.status, 'completed'));

  // 2. Fetch all reactions
  const reactionRows = await db.select().from(reactions);

  // 3. Fetch all winner votes
  const voteRows = await db.select().from(winnerVotes);

  // 4. Fetch all non-archived agents
  const agentRows = await db
    .select({
      id: agents.id,
      name: agents.name,
      presetId: agents.presetId,
      tier: agents.tier,
      responseLength: agents.responseLength,
      responseFormat: agents.responseFormat,
      ownerId: agents.ownerId,
      parentId: agents.parentId,
      archived: agents.archived,
      createdAt: agents.createdAt,
    })
    .from(agents)
    .where(eq(agents.archived, false));

  // 5. Anonymize and assemble
  const anonymizedBouts = await Promise.all(
    boutRows.map(async (b) => ({
      id: b.id,
      presetId: b.presetId,
      topic: b.topic,
      responseLength: b.responseLength,
      responseFormat: b.responseFormat,
      turnCount: ((b.transcript ?? []) as TranscriptEntry[]).length,
      ownerId: await anonymizeUserId(b.ownerId),
      createdAt: b.createdAt?.toISOString() ?? null,
    })),
  );

  const anonymizedReactions = reactionRows.map((r) => ({
    boutId: r.boutId,
    turnIndex: r.turnIndex,
    reactionType: r.reactionType,
    createdAt: r.createdAt?.toISOString() ?? null,
  }));

  const anonymizedVotes = await Promise.all(
    voteRows.map(async (v) => ({
      boutId: v.boutId,
      agentId: v.agentId,
      userId: await anonymizeUserId(v.userId),
      createdAt: v.createdAt?.toISOString() ?? null,
    })),
  );

  const anonymizedAgents = await Promise.all(
    agentRows.map(async (a) => ({
      id: a.id,
      name: a.name,
      presetId: a.presetId,
      tier: a.tier,
      responseLength: a.responseLength,
      responseFormat: a.responseFormat,
      ownerId: await anonymizeOwnerId(a.ownerId),
      parentId: a.parentId,
      createdAt: a.createdAt?.toISOString() ?? null,
    })),
  );

  const payload = {
    exportVersion: version,
    generatedAt: new Date().toISOString(),
    bouts: anonymizedBouts,
    reactions: anonymizedReactions,
    votes: anonymizedVotes,
    agents: anonymizedAgents,
  };

  // 6. Insert into research_exports
  const [row] = await db
    .insert(researchExports)
    .values({
      version,
      boutCount: anonymizedBouts.length,
      reactionCount: anonymizedReactions.length,
      voteCount: anonymizedVotes.length,
      agentCount: anonymizedAgents.length,
      payload,
    })
    .returning({
      id: researchExports.id,
      generatedAt: researchExports.generatedAt,
    });
  if (!row) throw new Error('Insert returned no rows');

  return {
    id: row.id,
    version,
    generatedAt: row.generatedAt?.toISOString() ?? new Date().toISOString(),
    boutCount: anonymizedBouts.length,
    reactionCount: anonymizedReactions.length,
    voteCount: anonymizedVotes.length,
    agentCount: anonymizedAgents.length,
  };
}

/**
 * Get the latest research export metadata (without payload).
 */
export async function getLatestExportMetadata(): Promise<ExportMetadata | null> {
  const db = requireDb();
  const [row] = await db
    .select({
      id: researchExports.id,
      version: researchExports.version,
      generatedAt: researchExports.generatedAt,
      boutCount: researchExports.boutCount,
      reactionCount: researchExports.reactionCount,
      voteCount: researchExports.voteCount,
      agentCount: researchExports.agentCount,
    })
    .from(researchExports)
    .orderBy(sql`${researchExports.generatedAt} desc`)
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    version: row.version,
    generatedAt: row.generatedAt?.toISOString() ?? '',
    boutCount: row.boutCount,
    reactionCount: row.reactionCount,
    voteCount: row.voteCount,
    agentCount: row.agentCount,
  };
}

/**
 * Get a research export's full payload by ID.
 */
export async function getExportPayload(
  exportId: number,
): Promise<Record<string, unknown> | null> {
  const db = requireDb();
  const [row] = await db
    .select({ payload: researchExports.payload })
    .from(researchExports)
    .where(eq(researchExports.id, exportId))
    .limit(1);

  return (row?.payload as Record<string, unknown>) ?? null;
}
