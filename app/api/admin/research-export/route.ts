import { withLogging } from '@/lib/api-logging';
import { generateResearchExport } from '@/lib/research-exports';
import { requireAdmin } from '@/lib/admin-auth';
import { log } from '@/lib/logger';

export const runtime = 'nodejs';

export const POST = withLogging(async function POST(req: Request) {
  try {
    requireAdmin(req);
  } catch {
    return new Response('Unauthorized.', { status: 401 });
  }

  let payload: { version?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  const version =
    typeof payload.version === 'string' ? payload.version.trim() : '';
  if (!version || version.length > 16) {
    return new Response('version required (max 16 chars).', { status: 400 });
  }

  const result = await generateResearchExport(version);

  log.info('audit', { action: 'generate_research_export', version });
  return Response.json(result, { status: 201 });
}, 'admin-research-export');
