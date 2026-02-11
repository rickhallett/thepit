// Internal page view recording endpoint.
//
// Called by middleware (fire-and-forget) to record page views without
// importing DB code into edge middleware. Protected by a shared secret
// to prevent external abuse.

import { requireDb } from '@/db';
import { pageViews } from '@/db/schema';
import { sha256Hex } from '@/lib/hash';
import { errorResponse, parseJsonBody, API_ERRORS } from '@/lib/api-utils';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // Verify internal secret — reject external callers
  const secret = req.headers.get('x-pv-secret');
  if (!secret || secret !== process.env.PV_INTERNAL_SECRET) {
    return errorResponse(API_ERRORS.FORBIDDEN, 403);
  }

  const parsed = await parseJsonBody<{
    path?: string;
    sessionId?: string;
    clientIp?: string;
    referer?: string;
    userAgent?: string;
    country?: string;
    utm?: string;
  }>(req);
  if (parsed.error) return parsed.error;
  const payload = parsed.data;

  const path = typeof payload.path === 'string' ? payload.path : '';
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : '';

  if (!path || !sessionId) {
    return errorResponse('Missing path or sessionId.', 400);
  }

  // Parse UTM from cookie JSON
  let utmSource: string | null = null;
  let utmMedium: string | null = null;
  let utmCampaign: string | null = null;
  if (payload.utm) {
    try {
      const utm = JSON.parse(payload.utm);
      utmSource = utm.utm_source ?? null;
      utmMedium = utm.utm_medium ?? null;
      utmCampaign = utm.utm_campaign ?? null;
    } catch {
      // Malformed cookie — ignore
    }
  }

  const ipHash = payload.clientIp ? await sha256Hex(payload.clientIp) : null;

  try {
    const db = requireDb();
    await db.insert(pageViews).values({
      path: path.slice(0, 512),
      sessionId: sessionId.slice(0, 32),
      referrer: payload.referer?.slice(0, 1024) || null,
      userAgent: payload.userAgent?.slice(0, 512) || null,
      ipHash,
      utmSource,
      utmMedium,
      utmCampaign,
      country: payload.country?.slice(0, 2) || null,
    });
  } catch {
    // Best-effort — don't fail the page load
    return errorResponse(API_ERRORS.INTERNAL, 500);
  }

  return Response.json({ ok: true });
}
