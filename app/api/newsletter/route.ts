import { requireDb } from '@/db';
import { newsletterSignups } from '@/db/schema';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';
import { parseValidBody, rateLimitResponse } from '@/lib/api-utils';
import { newsletterSchema } from '@/lib/api-schemas';

// @review(L2-E2) CANONICAL PATTERN: This is the cleanest example of the load-bearing
//   API route pattern. withLogging (context injection) -> rate limit -> parseValidBody
//   (discriminated union, compiler-enforced error handling) -> business logic -> Response.json.
//   31 lines. Every route follows this shape or has a documented reason not to.
//   [severity:sound] [domain:api] [connects:L2-E1]

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
