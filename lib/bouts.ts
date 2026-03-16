// Shared bout data access layer.
//
// Encapsulates all bout-related database queries used across page routes,
// OG image generation, sitemaps, and short-link validation.

import { desc, eq } from 'drizzle-orm';

import { db, requireDb } from '@/db';
import { bouts, type TranscriptEntry, type ArenaAgent } from '@/db/schema';

export type Bout = typeof bouts.$inferSelect;

/**
 * Load a bout by ID, returning the full row or null if not found (or if
 * the database connection is unavailable).
 *
 * Uses the nullable `db` export so callers in metadata generators (where
 * requireDb would throw) can safely get null when DATABASE_URL is unset.
 */
export async function getBoutById(id: string): Promise<Bout | null> {
  if (!db) return null;
  const [row] = await db
    .select()
    .from(bouts)
    .where(eq(bouts.id, id))
    .limit(1);
  return row ?? null;
}

/** Insert a new bout record. */
export async function insertBout(values: {
  id: string;
  presetId: string;
  status: 'running' | 'completed' | 'error';
  transcript: TranscriptEntry[];
  ownerId: string | null;
  topic?: string | null;
  responseLength?: string;
  responseFormat?: string;
  maxTurns?: number;
  agentLineup?: ArenaAgent[];
}): Promise<void> {
  const dbConn = requireDb();
  await dbConn.insert(bouts).values(values);
}

/** Check whether a bout with the given ID exists. */
export async function boutExists(id: string): Promise<boolean> {
  const dbConn = requireDb();
  const [row] = await dbConn
    .select({ id: bouts.id })
    .from(bouts)
    .where(eq(bouts.id, id))
    .limit(1);
  return !!row;
}

/** Fetch completed bout summaries for sitemap generation. */
export async function getCompletedBoutSummaries(
  limit: number,
): Promise<{ id: string; updatedAt: Date | null }[]> {
  const dbConn = requireDb();
  return dbConn
    .select({ id: bouts.id, updatedAt: bouts.updatedAt })
    .from(bouts)
    .where(eq(bouts.status, 'completed'))
    .orderBy(desc(bouts.createdAt))
    .limit(limit);
}
