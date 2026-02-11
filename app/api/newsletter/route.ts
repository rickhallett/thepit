import { requireDb } from '@/db';
import { newsletterSignups } from '@/db/schema';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { withLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST = withLogging(async function POST(req: Request) {
  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(
    { name: 'newsletter', maxRequests: 5, windowMs: 60 * 60 * 1000 },
    clientId,
  );
  if (!rateCheck.success) {
    return new Response('Too many requests. Try again later.', { status: 429 });
  }

  let payload: { email?: string };

  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (!email) {
    return new Response('Email required.', { status: 400 });
  }
  if (!EMAIL_RE.test(email) || email.length > 256) {
    return new Response('Invalid email address.', { status: 400 });
  }

  const db = requireDb();
  await db
    .insert(newsletterSignups)
    .values({ email })
    .onConflictDoNothing();

  return Response.json({ ok: true });
}, 'newsletter');
