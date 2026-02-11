import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { withLogging } from '@/lib/api-logging';
import { checkRateLimit } from '@/lib/rate-limit';

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
    return new Response('Authentication required.', { status: 401 });
  }

  const rateCheck = checkRateLimit(RATE_LIMIT, userId);
  if (!rateCheck.success) {
    return new Response('Rate limit exceeded.', { status: 429 });
  }

  let payload: { key?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  const key = typeof payload.key === 'string' ? payload.key.trim() : '';
  if (!key) {
    return new Response('Missing key.', { status: 400 });
  }

  if (key.length > KEY_MAX_LENGTH) {
    return new Response('Key too long.', { status: 400 });
  }

  if (!key.startsWith(KEY_PREFIX)) {
    return new Response('Invalid key format.', { status: 400 });
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
