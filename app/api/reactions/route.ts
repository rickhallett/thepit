import { auth } from '@clerk/nextjs/server';

import { requireDb } from '@/db';
import { reactions } from '@/db/schema';
import { errorResponse, parseJsonBody, rateLimitResponse } from '@/lib/api-utils';
import {
  checkRateLimit,
  getClientIdentifier,
  type RateLimitConfig,
} from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

// Rate limit: 30 reactions per minute per IP
const RATE_LIMIT_CONFIG: RateLimitConfig = {
  name: 'reactions',
  maxRequests: 30,
  windowMs: 60 * 1000,
};

export const POST = withLogging(async function POST(req: Request) {
  // Check rate limit before processing
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(RATE_LIMIT_CONFIG, clientId);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  const parsed = await parseJsonBody<{
    boutId?: string;
    turnIndex?: number;
    reactionType?: string;
  }>(req);
  if (parsed.error) return parsed.error;
  const payload = parsed.data;

  const boutId =
    typeof payload.boutId === 'string' ? payload.boutId.trim() : '';
  const reactionType =
    typeof payload.reactionType === 'string'
      ? payload.reactionType.trim()
      : '';

  if (!boutId || typeof payload.turnIndex !== 'number') {
    return errorResponse('Missing boutId or turnIndex.', 400);
  }

  // FINDING-007: Validate boutId format (nanoid: alphanumeric + _ + -, 10-30 chars)
  if (!/^[\w-]{10,30}$/.test(boutId)) {
    return errorResponse('Invalid boutId format.', 400);
  }

  // FINDING-007: Validate turnIndex is a non-negative integer
  if (!Number.isInteger(payload.turnIndex) || payload.turnIndex < 0) {
    return errorResponse('turnIndex must be a non-negative integer.', 400);
  }

  if (!['heart', 'fire'].includes(reactionType)) {
    return errorResponse('Invalid reaction type.', 400);
  }

  const { userId } = await auth();
  const ip = getClientIdentifier(req);
  const db = requireDb();

  // Deduplicate: one reaction per user (or IP) per turn per type.
  // Uses the clientId as a stable identifier for anonymous users.
  const dedupeUserId = userId ?? `anon:${ip}`;
  await db
    .insert(reactions)
    .values({
      boutId,
      turnIndex: payload.turnIndex,
      reactionType,
      userId: dedupeUserId,
    })
    .onConflictDoNothing();

  return Response.json({ ok: true }, {
    headers: {
      'X-RateLimit-Remaining': String(rateLimit.remaining),
    },
  });
}, 'reactions');
