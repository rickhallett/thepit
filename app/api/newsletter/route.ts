import { requireDb } from '@/db';
import { newsletterSignups } from '@/db/schema';

export const runtime = 'nodejs';

export async function POST(req: Request) {
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

  const db = requireDb();
  await db.insert(newsletterSignups).values({ email });

  return Response.json({ ok: true });
}
