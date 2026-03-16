import { requireAdmin } from '@/lib/admin-auth';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';
import { withLogging } from '@/lib/api-logging';
import { seedAllAgents } from '@/lib/seed-agents';

export const runtime = 'nodejs';

async function rawPOST(req: Request) {
  try {
    requireAdmin(req);
  } catch {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const result = await seedAllAgents();
  return Response.json(result);
}

export const POST = withLogging(rawPOST, 'seed-agents');
