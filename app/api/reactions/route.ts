import { auth } from '@clerk/nextjs/server';

import { errorResponse, parseValidBody, rateLimitResponse } from '@/lib/api-utils';
import { sha256Hex } from '@/lib/hash';
import {
  checkRateLimit,
  getClientIdentifier,
  type RateLimitConfig,
} from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';
import { reactionSchema } from '@/lib/api-schemas';
import { toggleReaction } from '@/lib/reactions';

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

  /*
   * Anonymous users: store userId as null (FK-safe) and use clientFingerprint
   * for deduplication via the unique index. Authenticated users: use their
   * real userId for both FK and dedupe.
   */
  const dbUserId = userId ?? null;
  const ipHash = await sha256Hex(ip);
  const fingerprint = userId ?? `anon:${ipHash}`;

  const result = await toggleReaction({
    boutId,
    turnIndex,
    reactionType,
    userId: dbUserId,
    clientFingerprint: fingerprint,
  });

  if (!result.ok) {
    return errorResponse(result.error, result.status);
  }

  return Response.json({
    ok: true,
    action: result.action,
    counts: result.counts,
    turnIndex,
  }, {
    headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) },
  });
}, 'reactions');
