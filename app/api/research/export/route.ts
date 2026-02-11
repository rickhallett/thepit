// Public research export download endpoint.
//
// GET /api/research/export         — returns latest export metadata
// GET /api/research/export?id=N    — returns full payload as JSON download

import { withLogging } from '@/lib/api-logging';
import {
  getLatestExportMetadata,
  getExportPayload,
} from '@/lib/research-exports';

export const runtime = 'nodejs';

export const GET = withLogging(async function GET(req: Request) {
  const url = new URL(req.url);
  const exportId = url.searchParams.get('id');

  if (exportId) {
    const id = parseInt(exportId, 10);
    if (isNaN(id) || id < 1) {
      return new Response('Invalid export ID.', { status: 400 });
    }

    const payload = await getExportPayload(id);
    if (!payload) {
      return new Response('Export not found.', { status: 404 });
    }

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="thepit-research-export-${id}.json"`,
      },
    });
  }

  // Default: return latest metadata
  const metadata = await getLatestExportMetadata();
  if (!metadata) {
    return Response.json({ available: false }, { status: 200 });
  }

  return Response.json({ available: true, ...metadata });
}, 'research-export');
