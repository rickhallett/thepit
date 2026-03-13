import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { agents } from '@/db/schema';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH /api/agents/[id]/archive - toggle archived status for an agent. */
export async function PATCH(
  _req: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const { id: agentId } = await params;

  const db = requireDb();

  // Fetch the agent and verify ownership
  const [agent] = await db
    .select({
      id: agents.id,
      ownerId: agents.ownerId,
      archived: agents.archived,
    })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent) {
    return errorResponse(API_ERRORS.NOT_FOUND, 404);
  }

  if (agent.ownerId !== userId) {
    return errorResponse(API_ERRORS.FORBIDDEN, 403);
  }

  // Toggle archived status
  const newArchivedStatus = !agent.archived;

  await db
    .update(agents)
    .set({ archived: newArchivedStatus })
    .where(eq(agents.id, agentId));

  return Response.json({
    id: agentId,
    archived: newArchivedStatus,
  });
}
