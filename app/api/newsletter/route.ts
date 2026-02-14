import { requireDb } from '@/db';
import { newsletterSignups } from '@/db/schema';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';
import { errorResponse, parseJsonBody, rateLimitResponse } from '@/lib/api-utils';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST = withLogging(async function POST(req: Request) {
  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(
    { name: 'newsletter', maxRequests: 5, windowMs: 60 * 60 * 1000 },
    clientId,
  );
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const parsed = await parseJsonBody<{ email?: string }>(req);
  if (parsed.error) return parsed.error;
  const payload = parsed.data;

  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (!email) {
    return errorResponse('Email required.', 400);
  }
  // FINDING-009: Reject emails containing angle brackets or other HTML characters
  if (!EMAIL_RE.test(email) || email.length > 256 || /[<>"']/.test(email)) {
    return errorResponse('Invalid email address.', 400);
  }

  const db = requireDb();
  await db
    .insert(newsletterSignups)
    .values({ email })
    .onConflictDoNothing();

  return Response.json({ ok: true });
}, 'newsletter');
