import { auth } from '@clerk/nextjs/server';

import { spec } from '@/lib/openapi';
import { getUserTier, SUBSCRIPTIONS_ENABLED, TIER_CONFIG } from '@/lib/tier';

/**
 * Serve the OpenAPI spec as JSON. Gated behind Lab tier.
 *
 * The rendered docs page at /docs/api is public (marketing value),
 * but the raw spec JSON requires Lab tier auth (enables code generation,
 * Postman import, SDK generation, etc.).
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  if (SUBSCRIPTIONS_ENABLED) {
    const tier = await getUserTier(userId);
    if (!TIER_CONFIG[tier].apiAccess) {
      return Response.json(
        { error: 'API access requires a Pit Lab subscription.' },
        { status: 403 },
      );
    }
  }

  return Response.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
