import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { withLogging } from '@/lib/api-logging';
import { checkRateLimit } from '@/lib/rate-limit';
import { errorResponse, parseJsonBody, API_ERRORS } from '@/lib/api-utils';

export const runtime = 'nodejs';

const COOKIE_NAME = 'pit_byok';
const MAX_AGE_SECONDS = 60;
const KEY_PREFIX = 'sk-ant-';
const KEY_MAX_LENGTH = 256;
const RATE_LIMIT = { name: 'byok-stash', maxRequests: 10, windowMs: 60_000 };

/**
 * Stash a BYOK key in a short-lived, HTTP-only cookie.
 * The key is read once by /api/run-bout and then deleted.
 * This eliminates the sessionStorage XSS window entirely.
 * Requires authentication to prevent cookie jar pollution.
 */
export const POST = withLogging(async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const rateCheck = checkRateLimit(RATE_LIMIT, userId);
  if (!rateCheck.success) {
    return errorResponse(API_ERRORS.RATE_LIMITED, 429);
  }

  const parsed = await parseJsonBody<{ key?: string }>(req);
  if (parsed.error) return parsed.error;
  const payload = parsed.data;

  const key = typeof payload.key === 'string' ? payload.key.trim() : '';
  if (!key) {
    return errorResponse('Missing key.', 400);
  }

  if (key.length > KEY_MAX_LENGTH) {
    return errorResponse('Key too long.', 400);
  }

  if (!key.startsWith(KEY_PREFIX)) {
    return errorResponse('Invalid key format.', 400);
  }

  const jar = await cookies();
  jar.set(COOKIE_NAME, key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/run-bout',
    maxAge: MAX_AGE_SECONDS,
  });

  return Response.json({ ok: true });
}, 'byok-stash');

/**
 * Read and delete the stashed BYOK key (used internally by run-bout).
 */
export function readAndClearByokKey(jar: Awaited<ReturnType<typeof cookies>>): string | null {
  const cookie = jar.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  jar.delete(COOKIE_NAME);
  return cookie.value;
}
