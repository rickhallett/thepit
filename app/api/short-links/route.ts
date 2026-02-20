import { requireDb } from '@/db';
import { bouts } from '@/db/schema';
import { withLogging } from '@/lib/api-logging';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { createShortLink } from '@/lib/short-links';
import { eq } from 'drizzle-orm';
import { errorResponse, parseValidBody, rateLimitResponse } from '@/lib/api-utils';
import { shortLinkSchema } from '@/lib/api-schemas';

export const runtime = 'nodejs';

export const POST = withLogging(async function POST(req: Request) {
  const rateCheck = checkRateLimit(
    { name: 'short-links', maxRequests: 30, windowMs: 60 * 1000 },
    getClientIdentifier(req),
  );
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const parsed = await parseValidBody(req, shortLinkSchema);
  if (parsed.error) return parsed.error;
  const { boutId } = parsed.data;

  // Verify bout exists
  const db = requireDb();
  const [bout] = await db
    .select({ id: bouts.id })
    .from(bouts)
    .where(eq(bouts.id, boutId))
    .limit(1);

  if (!bout) {
    return errorResponse('Bout not found.', 404);
  }

  const { slug, created } = await createShortLink(boutId);

  return Response.json({ slug, created }, { status: created ? 201 : 200 });
}, 'short-links');
