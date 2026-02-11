import { auth } from '@clerk/nextjs/server';

import { requireDb } from '@/db';
import { reactions } from '@/db/schema';
import {
  checkRateLimit,
  getClientIdentifier,
  type RateLimitConfig,
} from '@/lib/rate-limit';

export const runtime = 'nodejs';

// Rate limit: 30 reactions per minute per IP
const RATE_LIMIT_CONFIG: RateLimitConfig = {
  name: 'reactions',
  maxRequests: 30,
  windowMs: 60 * 1000,
};

export async function POST(req: Request) {
  // Check rate limit before processing
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(RATE_LIMIT_CONFIG, clientId);

  if (!rateLimit.success) {
    return new Response('Too many requests.', {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(rateLimit.resetAt),
      },
    });
  }

  let payload: {
    boutId?: string;
    turnIndex?: number;
    reactionType?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  const boutId =
    typeof payload.boutId === 'string' ? payload.boutId.trim() : '';
  const reactionType =
    typeof payload.reactionType === 'string'
      ? payload.reactionType.trim()
      : '';

  if (!boutId || typeof payload.turnIndex !== 'number') {
    return new Response('Missing boutId or turnIndex.', { status: 400 });
  }

  if (!['heart', 'fire'].includes(reactionType)) {
    return new Response('Invalid reaction type.', { status: 400 });
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
}
