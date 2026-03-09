/**
 * lib/sharing/short-links.ts — Short link creation and resolution.
 *
 * Short links use nanoid(8) slugs for memorable, shareable URLs.
 * One short link per bout (unique constraint on bout_id).
 * createShortLink is idempotent — returns existing slug if already created.
 */

import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import { shortLinks } from "@/db/schema";
import { eq } from "drizzle-orm";

export const ShortLinkRequestSchema = z.object({
  boutId: z.string().min(1),
});

const MAX_SLUG_RETRIES = 3;

/**
 * Creates a short link for a bout, or returns the existing one.
 * Idempotent: same boutId always returns same slug.
 * Retries on slug collision (nanoid(8) has ~1 in 2.8 trillion collision rate,
 * but we handle it defensively).
 */
export async function createShortLink(boutId: string): Promise<string> {
  // 1. Check if short link already exists for this boutId
  const existing = await db
    .select({ slug: shortLinks.slug })
    .from(shortLinks)
    .where(eq(shortLinks.boutId, boutId))
    .limit(1);

  if (existing.length > 0 && existing[0].slug) {
    return existing[0].slug;
  }

  // 2. Generate slug and insert, retrying on slug collision.
  // Two unique constraints: boutId (one link per bout) and slug (globally unique).
  // A slug collision throws; a boutId conflict means another request won the race.
  for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
    const slug = nanoid(8);

    try {
      // INSERT — if boutId already exists (race), ON CONFLICT DO NOTHING.
      // If slug collides (different bout), the unique constraint throws.
      await db
        .insert(shortLinks)
        .values({ boutId, slug })
        .onConflictDoNothing({ target: shortLinks.boutId });

      // SELECT to get the final slug (ours or the race winner's)
      const [result] = await db
        .select({ slug: shortLinks.slug })
        .from(shortLinks)
        .where(eq(shortLinks.boutId, boutId))
        .limit(1);

      if (result?.slug) {
        return result.slug;
      }
    } catch (err: unknown) {
      // Slug collision (unique constraint on slug column).
      // Retry with a new slug unless exhausted.
      const isUniqueViolation =
        err instanceof Error && err.message.includes("unique");
      if (!isUniqueViolation || attempt === MAX_SLUG_RETRIES - 1) {
        throw err;
      }
      // Continue to next attempt with a fresh slug
    }
  }

  // Should never reach here, but fail explicitly
  throw new Error(`Failed to create short link after ${MAX_SLUG_RETRIES} attempts`);
}

/**
 * Resolves a short link slug to a bout ID.
 * Returns null if slug doesn't exist.
 */
export async function resolveShortLink(slug: string): Promise<string | null> {
  const [result] = await db
    .select({ boutId: shortLinks.boutId })
    .from(shortLinks)
    .where(eq(shortLinks.slug, slug))
    .limit(1);

  return result?.boutId ?? null;
}
