import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { withLogging } from '@/lib/api-logging';
import { checkRateLimit } from '@/lib/rate-limit';
import { errorResponse, parseValidBody, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';
import { byokStashSchema } from '@/lib/api-schemas';
import { isValidByokKey, detectProvider, isOpenRouterModel, ALL_MODEL_IDS } from '@/lib/models';
import { getUserTier, SUBSCRIPTIONS_ENABLED } from '@/lib/tier';
import { encodeByokCookie, BYOK_COOKIE_NAME, BYOK_MAX_AGE_SECONDS } from '@/lib/byok';

// Re-export for backward compatibility (tests, etc.)
export { encodeByokCookie, decodeByokCookie, readAndClearByokKey } from '@/lib/byok';

export const runtime = 'nodejs';

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

  // BYOK is a subscriber-only feature
  if (SUBSCRIPTIONS_ENABLED) {
    const tier = await getUserTier(userId);
    if (tier === 'free') {
      return errorResponse(
        'BYOK is available to subscribers only. Upgrade to Pit Pass or Pit Lab.',
        403,
      );
    }
  }

  const rateCheck = checkRateLimit(RATE_LIMIT, userId);
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const parsed = await parseValidBody(req, byokStashSchema);
  if (parsed.error) return parsed.error;
  const { key, model } = parsed.data;

  if (!isValidByokKey(key)) {
    return errorResponse('Invalid key format. Expected sk-ant-* (Anthropic) or sk-or-v1-* (OpenRouter).', 400);
  }

  const provider = detectProvider(key)!;
  if (model) {
    if (provider === 'openrouter' && !isOpenRouterModel(model)) {
      return errorResponse('Unsupported OpenRouter model.', 400);
    }
    if (provider === 'anthropic' && !ALL_MODEL_IDS.includes(model as typeof ALL_MODEL_IDS[number])) {
      return errorResponse('Unsupported Anthropic model.', 400);
    }
  }

  // Encode provider + model + key into cookie value
  const cookieValue = encodeByokCookie(provider, key, model);

  const jar = await cookies();
  jar.set(BYOK_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/run-bout',
    maxAge: BYOK_MAX_AGE_SECONDS,
  });

  return Response.json({ ok: true, provider });
}, 'byok-stash');


