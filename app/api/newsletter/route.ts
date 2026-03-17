import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';
import { parseValidBody, rateLimitResponse } from '@/lib/api-utils';
import { newsletterSchema } from '@/lib/api-schemas';
import { subscribeNewsletter } from '@/lib/submissions';

export const runtime = 'nodejs';

export const POST = withLogging(async function POST(req: Request) {
  const clientId = getClientIdentifier(req);
  const rateCheck = await checkRateLimit(
    { name: 'newsletter', maxRequests: 5, windowMs: 60 * 60 * 1000 },
    clientId,
  );
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const parsed = await parseValidBody(req, newsletterSchema);
  if (parsed.error) return parsed.error;
  const { email } = parsed.data;

  await subscribeNewsletter(email);

  return Response.json({ ok: true });
}, 'newsletter');
