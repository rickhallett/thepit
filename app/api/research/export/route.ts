// Public research export download endpoint.
//
// GET /api/research/export         — returns latest export metadata
// GET /api/research/export?id=N    — returns full payload as JSON download

import { withLogging } from '@/lib/api-logging';
import {
  getLatestExportMetadata,
  getExportPayload,
} from '@/lib/research-exports';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';

export const runtime = 'nodejs';

const RATE_LIMIT = { name: 'research-export', maxRequests: 5, windowMs: 60 * 60 * 1000 };

export const GET = withLogging(async function GET(req: Request) {
  const rateCheck = checkRateLimit(RATE_LIMIT, getClientIdentifier(req));
  if (!rateCheck.success) {
    return errorResponse(API_ERRORS.RATE_LIMITED, 429);
  }

  const url = new URL(req.url);
  const exportId = url.searchParams.get('id');

  if (exportId) {
    const id = parseInt(exportId, 10);
    if (isNaN(id) || id < 1) {
      return errorResponse('Invalid export ID.', 400);
    }

    const payload = await getExportPayload(id);
    if (!payload) {
      return errorResponse(API_ERRORS.NOT_FOUND, 404);
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
