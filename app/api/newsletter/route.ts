import { requireDb } from '@/db';
import { newsletterSignups } from '@/db/schema';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';
import { parseValidBody, rateLimitResponse } from '@/lib/api-utils';
import { newsletterSchema } from '@/lib/api-schemas';

export const runtime = 'nodejs';

export const POST = withLogging(async function POST(req: Request) {
  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(
    { name: 'newsletter', maxRequests: 5, windowMs: 60 * 60 * 1000 },
    clientId,
  );
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const parsed = await parseValidBody(req, newsletterSchema);
  if (parsed.error) return parsed.error;
  const { email } = parsed.data;

  const db = requireDb();
  await db
    .insert(newsletterSignups)
    .values({ email })
    .onConflictDoNothing();

  return Response.json({ ok: true });
}, 'newsletter');
