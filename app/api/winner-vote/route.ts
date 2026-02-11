import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { bouts, winnerVotes } from '@/db/schema';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let payload: { boutId?: string; agentId?: string };

  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  const boutId =
    typeof payload.boutId === 'string' ? payload.boutId.trim() : '';
  const agentId =
    typeof payload.agentId === 'string' ? payload.agentId.trim() : '';

  if (!boutId || !agentId) {
    return new Response('Missing boutId or agentId.', { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return new Response('Sign in required.', { status: 401 });
  }

  const db = requireDb();

  // Verify the bout exists before accepting the vote.
  const [bout] = await db
    .select({ id: bouts.id })
    .from(bouts)
    .where(eq(bouts.id, boutId))
    .limit(1);

  if (!bout) {
    return new Response('Bout not found.', { status: 404 });
  }

  await db
    .insert(winnerVotes)
    .values({ boutId, agentId, userId })
    .onConflictDoNothing();

  return Response.json({ ok: true });
}
