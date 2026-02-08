import { auth } from '@clerk/nextjs/server';

import { requireDb } from '@/db';
import { reactions } from '@/db/schema';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let payload: {
    boutId?: string;
    turnIndex?: number;
    reactionType?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  const boutId =
    typeof payload.boutId === 'string' ? payload.boutId.trim() : '';
  const reactionType =
    typeof payload.reactionType === 'string'
      ? payload.reactionType.trim()
      : '';

  if (!boutId || typeof payload.turnIndex !== 'number') {
    return new Response('Missing boutId or turnIndex.', { status: 400 });
  }

  if (!['heart', 'fire'].includes(reactionType)) {
    return new Response('Invalid reaction type.', { status: 400 });
  }

  const { userId } = await auth();
  const db = requireDb();
  await db.insert(reactions).values({
    boutId,
    turnIndex: payload.turnIndex,
    reactionType,
    userId: userId ?? null,
  });

  return Response.json({ ok: true });
}
