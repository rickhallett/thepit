// Short link CRUD operations for shareable bout URLs.
//
// Each bout can have at most one short link (unique index on boutId).
// Slugs are 8-character nanoid strings. Click analytics (UTM params,
// referer, user-agent, hashed IP) are recorded on resolution.

import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { requireDb } from '@/db';
import { shortLinks, shortLinkClicks } from '@/db/schema';
import { sha256Hex } from '@/lib/hash';

const SLUG_LENGTH = 8;

/** Generate a URL-safe 8-character slug. */
export function generateSlug(): string {
  return nanoid(SLUG_LENGTH);
}

/**
 * Create a short link for a bout, or return the existing one.
 * Idempotent: the unique index on boutId ensures one link per bout.
 */
export async function createShortLink(
  boutId: string,
  createdByUserId?: string | null,
): Promise<{ slug: string; created: boolean }> {
  const db = requireDb();

  // Check for existing short link first (common path for replays)
  const [existing] = await db
    .select({ slug: shortLinks.slug })
    .from(shortLinks)
    .where(eq(shortLinks.boutId, boutId))
    .limit(1);

  if (existing) {
    return { slug: existing.slug, created: false };
  }

  const slug = generateSlug();

  // Insert with onConflictDoNothing to handle races
  const result = await db
    .insert(shortLinks)
    .values({ slug, boutId, createdByUserId: createdByUserId ?? null })
    .onConflictDoNothing()
    .returning({ slug: shortLinks.slug });

  if (result.length > 0) {
    return { slug: result[0].slug, created: true };
  }

  // Race: another request created the link between our SELECT and INSERT.
  // Fetch the winner's slug.
  const [raced] = await db
    .select({ slug: shortLinks.slug })
    .from(shortLinks)
    .where(eq(shortLinks.boutId, boutId))
    .limit(1);

  return { slug: raced.slug, created: false };
}

/** Resolve a slug to a boutId. Returns null if not found. */
export async function resolveShortLink(
  slug: string,
): Promise<{ id: number; boutId: string } | null> {
  const db = requireDb();
  const [row] = await db
    .select({ id: shortLinks.id, boutId: shortLinks.boutId })
    .from(shortLinks)
    .where(eq(shortLinks.slug, slug))
    .limit(1);

  return row ?? null;
}

/** Look up a bout's short link slug. Returns null if none exists. */
export async function getShortLinkForBout(
  boutId: string,
): Promise<string | null> {
  const db = requireDb();
  const [row] = await db
    .select({ slug: shortLinks.slug })
    .from(shortLinks)
    .where(eq(shortLinks.boutId, boutId))
    .limit(1);

  return row?.slug ?? null;
}

/**
 * Record a click on a short link for analytics.
 * Non-blocking — callers should fire-and-forget.
 */
export async function recordClick(
  shortLinkId: number,
  boutId: string,
  req: Request,
): Promise<void> {
  const db = requireDb();
  const url = new URL(req.url);

  // Hash IP for privacy (never store raw IPs)
  const forwarded = req.headers.get('x-forwarded-for');
  const rawIp = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const ipHash = await sha256Hex(rawIp);

  await db.insert(shortLinkClicks).values({
    shortLinkId,
    boutId,
    refCode: url.searchParams.get('ref') ?? null,
    utmSource: url.searchParams.get('utm_source') ?? null,
    utmMedium: url.searchParams.get('utm_medium') ?? null,
    utmCampaign: url.searchParams.get('utm_campaign') ?? null,
    utmTerm: url.searchParams.get('utm_term') ?? null,
    utmContent: url.searchParams.get('utm_content') ?? null,
    referer: req.headers.get('referer') ?? null,
    userAgent: req.headers.get('user-agent') ?? null,
    ipHash,
  });
}
