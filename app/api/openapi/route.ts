import { spec } from '@/lib/openapi';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { rateLimitResponse } from '@/lib/api-utils';

/**
 * Serve the OpenAPI spec as JSON.
 *
 * Public — enables the /docs/api Scalar page, Postman import, and SDK
 * generation for anyone evaluating the platform.  Rate-limited by IP to
 * prevent abuse.
 */
const RATE_LIMIT = { name: 'openapi', maxRequests: 10, windowMs: 60_000 };

export async function GET(req: Request) {
  const rateCheck = checkRateLimit(RATE_LIMIT, getClientIdentifier(req));
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  return Response.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
