import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { reactions } from '@/db/schema';
import { errorResponse, parseJsonBody, rateLimitResponse } from '@/lib/api-utils';
import {
  checkRateLimit,
  getClientIdentifier,
  type RateLimitConfig,
} from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';
import { log } from '@/lib/logger';

export const runtime = 'nodejs';

// Rate limit: 30 reactions per minute per IP
const RATE_LIMIT_CONFIG: RateLimitConfig = {
  name: 'reactions',
  maxRequests: 30,
  windowMs: 60 * 1000,
};

type ReactionPayload = {
  boutId?: string;
  turnIndex?: number;
  reactionType?: string;
};

function validatePayload(payload: ReactionPayload):
  | { error: Response }
  | { boutId: string; turnIndex: number; reactionType: string } {
  if (!payload || typeof payload !== 'object') {
    return { error: errorResponse('Invalid request body.', 400) };
  }

  const boutId =
    typeof payload.boutId === 'string' ? payload.boutId.trim() : '';
  const reactionType =
    typeof payload.reactionType === 'string'
      ? payload.reactionType.trim()
      : '';

  if (!boutId || typeof payload.turnIndex !== 'number') {
    return { error: errorResponse('Missing boutId or turnIndex.', 400) };
  }

  if (!/^[\w-]{10,30}$/.test(boutId)) {
    return { error: errorResponse('Invalid boutId format.', 400) };
  }

  if (!Number.isInteger(payload.turnIndex) || payload.turnIndex < 0) {
    return { error: errorResponse('turnIndex must be a non-negative integer.', 400) };
  }

  if (!['heart', 'fire'].includes(reactionType)) {
    return { error: errorResponse('Invalid reaction type.', 400) };
  }

  return { boutId, turnIndex: payload.turnIndex, reactionType };
}

export const POST = withLogging(async function POST(req: Request) {
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(RATE_LIMIT_CONFIG, clientId);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  const parsed = await parseJsonBody<ReactionPayload>(req);
  if (parsed.error) return parsed.error;

  const validated = validatePayload(parsed.data);
  if ('error' in validated) return validated.error;
  const { boutId, turnIndex, reactionType } = validated;

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

  if (existing) {
    // Remove existing reaction (toggle off)
    await db.delete(reactions).where(eq(reactions.id, existing.id));
    log.info('reaction.toggled', { boutId, turnIndex, reactionType, action: 'removed', userId: dedupeUserId });
    return Response.json({ ok: true, action: 'removed' }, {
      headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) },
    });
  }

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

  log.info('reaction.toggled', { boutId, turnIndex, reactionType, action: 'added', userId: dedupeUserId });
  return Response.json({ ok: true, action: 'added' }, {
    headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) },
  });
}, 'reactions');
