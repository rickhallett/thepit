// Reactions library — toggle reactions, get counts, anonymous fingerprinting.
// Toggle is idempotent: same request = add then remove (toggle).
// Anonymous users identified by sha256(ip) fingerprint, never raw IP.

import { createHash } from "crypto";
import { z } from "zod";
import { db } from "@/db";
import { reactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const ReactionRequestSchema = z.object({
  boutId: z.string().min(1, "boutId is required").max(21),
  turnIndex: z.number().int().min(0),
  reactionType: z.enum(["heart", "fire"]),
});

export type ReactionRequest = z.infer<typeof ReactionRequestSchema>;

export interface ReactionCounts {
  heart: number;
  fire: number;
}

export interface ToggleResult {
  action: "added" | "removed";
  counts: ReactionCounts;
}

/**
 * Computes fingerprint for reaction deduplication.
 * Authenticated users: userId directly.
 * Anonymous: "anon:{sha256(ip).slice(0,16)}"
 */
export function computeFingerprint(userId: string | null, ip: string): string {
  if (userId) return userId;
  const hash = createHash("sha256").update(ip).digest("hex").slice(0, 16);
  return `anon:${hash}`;
}

/**
 * Toggle a reaction on a specific turn.
 * If reaction exists: delete it (removed).
 * If not exists: insert it (added).
 * Returns action taken and updated counts for the turn.
 *
 * Uses a transaction to prevent TOCTOU race conditions.
 * The DB unique constraint on (boutId, turnIndex, reactionType, clientFingerprint)
 * is the ultimate safety net; the transaction ensures consistent toggle + count.
 */
export async function toggleReaction(params: {
  boutId: string;
  turnIndex: number;
  reactionType: "heart" | "fire";
  userId: string | null;
  clientFingerprint: string;
}): Promise<ToggleResult> {
  const { boutId, turnIndex, reactionType, userId, clientFingerprint } = params;

  return await db.transaction(async (tx) => {
    // Check for existing reaction within transaction
    const existing = await tx
      .select({ id: reactions.id })
      .from(reactions)
      .where(
        and(
          eq(reactions.boutId, boutId),
          eq(reactions.turnIndex, turnIndex),
          eq(reactions.reactionType, reactionType),
          eq(reactions.clientFingerprint, clientFingerprint),
        ),
      )
      .limit(1);

    let action: "added" | "removed";

    if (existing.length > 0) {
      // Remove existing reaction
      await tx.delete(reactions).where(eq(reactions.id, existing[0].id));
      action = "removed";
    } else {
      // Add new reaction — unique constraint prevents duplicate on race
      await tx.insert(reactions).values({
        boutId,
        turnIndex,
        reactionType,
        userId,
        clientFingerprint,
      });
      action = "added";
    }

    // Get updated counts within the same transaction for consistency
    const countRows = await tx
      .select({
        reactionType: reactions.reactionType,
        count: sql<number>`count(*)::int`,
      })
      .from(reactions)
      .where(
        and(eq(reactions.boutId, boutId), eq(reactions.turnIndex, turnIndex)),
      )
      .groupBy(reactions.reactionType);

    const counts: ReactionCounts = { heart: 0, fire: 0 };
    for (const row of countRows) {
      if (row.reactionType === "heart" || row.reactionType === "fire") {
        counts[row.reactionType] = row.count;
      }
    }

    return { action, counts };
  });
}

/**
 * Get all reaction counts for a bout, keyed by turnIndex.
 * Returns Map<turnIndex, {heart, fire}>
 */
export async function getReactionCounts(
  boutId: string,
): Promise<Map<number, ReactionCounts>> {
  const rows = await db
    .select({
      turnIndex: reactions.turnIndex,
      reactionType: reactions.reactionType,
      count: sql<number>`count(*)::int`,
    })
    .from(reactions)
    .where(eq(reactions.boutId, boutId))
    .groupBy(reactions.turnIndex, reactions.reactionType);

  const result = new Map<number, ReactionCounts>();

  for (const row of rows) {
    if (row.turnIndex === null) continue;
    const type = row.reactionType;
    if (type !== "heart" && type !== "fire") continue;

    let entry = result.get(row.turnIndex);
    if (!entry) {
      entry = { heart: 0, fire: 0 };
      result.set(row.turnIndex, entry);
    }
    entry[type] = row.count;
  }

  return result;
}

/**
 * Get reactions for a specific user/fingerprint in a bout.
 * Returns Set of "turnIndex:reactionType" strings for O(1) lookup.
 */
export async function getUserReactions(
  boutId: string,
  clientFingerprint: string,
): Promise<Set<string>> {
  const rows = await db
    .select({
      turnIndex: reactions.turnIndex,
      reactionType: reactions.reactionType,
    })
    .from(reactions)
    .where(
      and(
        eq(reactions.boutId, boutId),
        eq(reactions.clientFingerprint, clientFingerprint),
      ),
    );

  const result = new Set<string>();
  for (const row of rows) {
    if (row.turnIndex !== null && row.reactionType) {
      result.add(`${row.turnIndex}:${row.reactionType}`);
    }
  }
  return result;
}

/**
 * Get the turn index with the most reactions (heart + fire combined).
 * Returns null if no reactions exist.
 */
export async function getMostReactedTurnIndex(
  boutId: string,
): Promise<number | null> {
  const rows = await db
    .select({
      turnIndex: reactions.turnIndex,
      count: sql<number>`count(*)::int`,
    })
    .from(reactions)
    .where(eq(reactions.boutId, boutId))
    .groupBy(reactions.turnIndex)
    .orderBy(sql`count(*) DESC`, sql`${reactions.turnIndex} ASC`)
    .limit(1);

  return rows.length > 0 && rows[0].turnIndex !== null
    ? rows[0].turnIndex
    : null;
}
