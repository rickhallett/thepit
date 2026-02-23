import { auth } from '@clerk/nextjs/server';
import { and, eq, sql } from 'drizzle-orm';

import { requireDb } from '@/db';
import { reactions } from '@/db/schema';
import { parseValidBody, rateLimitResponse } from '@/lib/api-utils';
import {
  checkRateLimit,
  getClientIdentifier,
  type RateLimitConfig,
} from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';
import { reactionSchema } from '@/lib/api-schemas';

export const runtime = 'nodejs';

// Rate limit: 30 reactions per minute per IP
const RATE_LIMIT_CONFIG: RateLimitConfig = {
  name: 'reactions',
  maxRequests: 30,
  windowMs: 60 * 1000,
};

export const POST = withLogging(async function POST(req: Request) {
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(RATE_LIMIT_CONFIG, clientId);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  const parsed = await parseValidBody(req, reactionSchema);
  if (parsed.error) return parsed.error;
  const { boutId, turnIndex, reactionType } = parsed.data;

  const { userId } = await auth();
  const ip = getClientIdentifier(req);
  const db = requireDb();
  const dedupeUserId = userId ?? `anon:${ip}`;

  // Toggle: check if reaction exists, then insert or delete
  const [existing] = await db
    .select({ id: reactions.id })
    .from(reactions)
    .where(
      and(
        eq(reactions.boutId, boutId),
        eq(reactions.turnIndex, turnIndex),
        eq(reactions.reactionType, reactionType),
        eq(reactions.userId, dedupeUserId),
      ),
    )
    .limit(1);

  let action: 'added' | 'removed';

  if (existing) {
    // Remove existing reaction (toggle off)
    await db.delete(reactions).where(eq(reactions.id, existing.id));
    action = 'removed';
  } else {
    // Add new reaction (toggle on)
    await db
      .insert(reactions)
      .values({
        boutId,
        turnIndex,
        reactionType,
        userId: dedupeUserId,
      })
      .onConflictDoNothing();
    action = 'added';
  }

  // Return absolute counts for this turn so the client can reconcile
  // without delta arithmetic. This eliminates optimistic update drift.
  const [counts] = await db
    .select({
      heart: sql<number>`cast(count(*) filter (where ${reactions.reactionType} = 'heart') as int)`,
      fire: sql<number>`cast(count(*) filter (where ${reactions.reactionType} = 'fire') as int)`,
    })
    .from(reactions)
    .where(
      and(
        eq(reactions.boutId, boutId),
        eq(reactions.turnIndex, turnIndex),
      ),
    );

  return Response.json({
    ok: true,
    action,
    counts: counts ?? { heart: 0, fire: 0 },
    turnIndex,
  }, {
    headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) },
  });
}, 'reactions');
