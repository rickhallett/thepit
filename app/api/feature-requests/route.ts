import { auth } from '@clerk/nextjs/server';

import { errorResponse, parseValidBody, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';
import { ensureUserRecord } from '@/lib/users';
import { featureRequestSchema } from '@/lib/api-schemas';
import { listFeatureRequests, createFeatureRequest } from '@/lib/feature-requests';

export const runtime = 'nodejs';

/** GET /api/feature-requests - public list of non-declined requests with vote counts. */
export const GET = withLogging(async function GET() {
  const { userId } = await auth();

  const requests = await listFeatureRequests(userId);

  return Response.json({ requests });
}, 'feature-requests-list');

/** POST /api/feature-requests - auth-required, rate-limited submission. */
export const POST = withLogging(async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const rateCheck = checkRateLimit(
    { name: 'feature-requests', maxRequests: 10, windowMs: 60 * 60 * 1000 },
    userId,
  );
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const parsed = await parseValidBody(req, featureRequestSchema);
  if (parsed.error) return parsed.error;
  const { title, description, category } = parsed.data;

  await ensureUserRecord(userId);

  const created = await createFeatureRequest(userId, { title, description, category });

  return Response.json({ ok: true, id: created.id });
}, 'feature-requests');
