// Shared bout loading queries.
//
// Encapsulates the common `SELECT * FROM bouts WHERE id = ?` pattern
// used across page routes and OG image generation. API routes that
// select a subset of columns for validation (reactions, winner-vote,
// short-links, bout-validation) intentionally keep their own narrower
// queries to avoid fetching unused data.

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { bouts } from '@/db/schema';

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
