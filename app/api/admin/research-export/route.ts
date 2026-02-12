import { withLogging } from '@/lib/api-logging';
import { generateResearchExport } from '@/lib/research-exports';
import { requireAdmin } from '@/lib/admin-auth';
import { log } from '@/lib/logger';
import { errorResponse, parseJsonBody, API_ERRORS } from '@/lib/api-utils';

export const runtime = 'nodejs';

export const POST = withLogging(async function POST(req: Request) {
  try {
    requireAdmin(req);
  } catch {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const parsed = await parseJsonBody<{ version?: string }>(req);
  if (parsed.error) return parsed.error;
  const payload = parsed.data;

  const version =
    typeof payload.version === 'string' ? payload.version.trim() : '';
  if (!version || version.length > 16) {
    return errorResponse('version required (max 16 chars).', 400);
  }

  const result = await generateResearchExport(version);

  log.info('audit', { action: 'generate_research_export', version });
  return Response.json(result, { status: 201 });
}, 'admin-research-export');
