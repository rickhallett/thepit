import { requireDb } from '@/db';
import { bouts } from '@/db/schema';
import { withLogging } from '@/lib/api-logging';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { createShortLink } from '@/lib/short-links';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export const POST = withLogging(async function POST(req: Request) {
  const rateCheck = checkRateLimit(
    { name: 'short-links', maxRequests: 30, windowMs: 60 * 1000 },
    getClientIdentifier(req),
  );
  if (!rateCheck.success) {
    return new Response('Too many requests. Try again later.', { status: 429 });
  }

  let payload: { boutId?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  const boutId =
    typeof payload.boutId === 'string' ? payload.boutId.trim() : '';

  if (!boutId || boutId.length > 21) {
    return new Response('Valid boutId required.', { status: 400 });
  }

  // Verify bout exists
  const db = requireDb();
  const [bout] = await db
    .select({ id: bouts.id })
    .from(bouts)
    .where(eq(bouts.id, boutId))
    .limit(1);

  if (!bout) {
    return new Response('Bout not found.', { status: 404 });
  }

  const { slug, created } = await createShortLink(boutId);

  return Response.json({ slug, created }, { status: created ? 201 : 200 });
}, 'short-links');
