import { auth } from '@clerk/nextjs/server';

import { spec } from '@/lib/openapi';
import { getUserTier, SUBSCRIPTIONS_ENABLED, TIER_CONFIG } from '@/lib/tier';
import { checkRateLimit } from '@/lib/rate-limit';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';

/**
 * Serve the OpenAPI spec as JSON. Gated behind Lab tier.
 *
 * The rendered docs page at /docs/api is public (marketing value),
 * but the raw spec JSON requires Lab tier auth (enables code generation,
 * Postman import, SDK generation, etc.).
 */
const RATE_LIMIT = { name: 'openapi', maxRequests: 10, windowMs: 60_000 };

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const rateCheck = checkRateLimit(RATE_LIMIT, userId);
  if (!rateCheck.success) {
    return errorResponse(API_ERRORS.RATE_LIMITED, 429);
  }

  if (SUBSCRIPTIONS_ENABLED) {
    const tier = await getUserTier(userId);
    if (!TIER_CONFIG[tier].apiAccess) {
      return errorResponse('API access requires a Pit Lab subscription.', 403);
    }
  }

  return Response.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
