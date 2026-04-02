import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { withLogging } from '@/lib/api-logging';
import { checkRateLimit } from '@/lib/rate-limit';
import { errorResponse, parseValidBody, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';
import { byokStashSchema } from '@/lib/api-schemas';
import { isValidByokKey } from '@/lib/models';
import { isValidModelId } from '@/lib/model-registry';
import { getUserTier, SUBSCRIPTIONS_ENABLED } from '@/lib/tier';
import { encodeByokCookie, BYOK_COOKIE_NAME, BYOK_MAX_AGE_SECONDS } from '@/lib/byok';

export { readAndClearByokKey } from '@/lib/byok';

export const runtime = 'nodejs';

const RATE_LIMIT = { name: 'byok-stash', maxRequests: 10, windowMs: 60_000 };

export const POST = withLogging(async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  if (SUBSCRIPTIONS_ENABLED) {
    const tier = await getUserTier(userId);
    if (tier === 'free') {
      return errorResponse(
        'BYOK is available to subscribers only. Upgrade to Pit Pass or Pit Lab.',
        403,
      );
    }
  }

  const rateCheck = await checkRateLimit(RATE_LIMIT, userId);
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const parsed = await parseValidBody(req, byokStashSchema);
  if (parsed.error) return parsed.error;
  const { key, model } = parsed.data;

  if (!isValidByokKey(key)) {
    return errorResponse(
      'Invalid key format. Use an OpenRouter key (sk-or-v1-*). Anthropic keys are no longer supported.',
      400,
    );
  }

  if (model && !isValidModelId(model)) {
    return errorResponse('Unsupported model.', 400);
  }

  const cookieValue = encodeByokCookie(key, model);

  const jar = await cookies();
  jar.set(BYOK_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/run-bout',
    maxAge: BYOK_MAX_AGE_SECONDS,
  });

  return Response.json({ ok: true });
}, 'byok-stash');
