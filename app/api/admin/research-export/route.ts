import { withLogging } from '@/lib/api-logging';
import { generateResearchExport } from '@/lib/research-exports';
import { requireAdmin } from '@/lib/admin-auth';
import { log } from '@/lib/logger';
import { errorResponse, parseValidBody, API_ERRORS } from '@/lib/api-utils';
import { researchExportSchema } from '@/lib/api-schemas';

export const runtime = 'nodejs';

export const POST = withLogging(async function POST(req: Request) {
  try {
    requireAdmin(req);
  } catch {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  const parsed = await parseValidBody(req, researchExportSchema);
  if (parsed.error) return parsed.error;
  const { version } = parsed.data;

  const result = await generateResearchExport(version);

  log.info('audit', { action: 'generate_research_export', version });
  return Response.json(result, { status: 201 });
}, 'admin-research-export');
