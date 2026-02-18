// Internal page view recording endpoint.
//
// Called by middleware (fire-and-forget) to record page views without
// importing DB code into edge middleware. Protected by a shared secret
// to prevent external abuse.

import crypto from 'crypto';

import { requireDb } from '@/db';
import { pageViews } from '@/db/schema';
import { sha256Hex } from '@/lib/hash';
import { log } from '@/lib/logger';
import { errorResponse, parseJsonBody, API_ERRORS } from '@/lib/api-utils';
import { withLogging } from '@/lib/api-logging';
import { serverTrack, flushServerAnalytics } from '@/lib/posthog-server';

export const runtime = 'nodejs';

/** Timing-safe string comparison using SHA-256 digests. */
function timingSafeCompare(a: string, b: string): boolean {
  const digestA = crypto.createHash('sha256').update(a).digest();
  const digestB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

async function rawPOST(req: Request) {
  // Verify internal secret — reject external callers
  const secret = req.headers.get('x-pv-secret');
  const expected = process.env.PV_INTERNAL_SECRET ?? '';
  if (!secret || !expected || !timingSafeCompare(secret, expected)) {
    return errorResponse(API_ERRORS.FORBIDDEN, 403);
  }

  const parsed = await parseJsonBody<{
    path?: string;
    sessionId?: string;
    clientIp?: string;
    referrer?: string;
    userAgent?: string;
    country?: string;
    utm?: string;
    userId?: string;
    copyVariant?: string;
    visitNumber?: number;
    daysSinceLastVisit?: number | null;
    isNewSession?: boolean;
  }>(req);
  if (parsed.error) return parsed.error;
  const payload = parsed.data;

  const path = typeof payload.path === 'string' ? payload.path : '';
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : '';

  if (!path || !sessionId) {
    return errorResponse('Missing path or sessionId.', 400);
  }

  // Parse UTM from cookie JSON — extract all 5 standard UTM params
  let utmSource: string | null = null;
  let utmMedium: string | null = null;
  let utmCampaign: string | null = null;
  let utmTerm: string | null = null;
  let utmContent: string | null = null;
  if (payload.utm) {
    try {
      const utm = JSON.parse(payload.utm);
      utmSource = typeof utm.utm_source === 'string' ? utm.utm_source.slice(0, 128) : null;
      utmMedium = typeof utm.utm_medium === 'string' ? utm.utm_medium.slice(0, 128) : null;
      utmCampaign = typeof utm.utm_campaign === 'string' ? utm.utm_campaign.slice(0, 128) : null;
      utmTerm = typeof utm.utm_term === 'string' ? utm.utm_term.slice(0, 128) : null;
      utmContent = typeof utm.utm_content === 'string' ? utm.utm_content.slice(0, 128) : null;
    } catch {
      // Malformed cookie — ignore
    }
  }

  const userId = typeof payload.userId === 'string' ? payload.userId.slice(0, 128) : null;
  const copyVariant = typeof payload.copyVariant === 'string' ? payload.copyVariant.slice(0, 32) : null;

  const ipHash = payload.clientIp ? await sha256Hex(payload.clientIp) : null;

  try {
    const db = requireDb();
    await db.insert(pageViews).values({
      path: path.slice(0, 512),
      userId,
      sessionId: sessionId.slice(0, 32),
      referrer: payload.referrer?.slice(0, 1024) || null,
      userAgent: payload.userAgent?.slice(0, 512) || null,
      ipHash,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      country: payload.country?.slice(0, 2) || null,
      copyVariant,
    });
    // --- Analytics: session_started (OCE-254) ---
    // Fire on the first page view of a new session to enable retention cohorts.
    if (payload.isNewSession) {
      const distinctId = userId ?? `anon_${sessionId}`;
      serverTrack(distinctId, 'session_started', {
        visit_number: payload.visitNumber ?? 1,
        days_since_last_visit: payload.daysSinceLastVisit ?? null,
        landing_page: path,
        referrer: payload.referrer?.slice(0, 256) ?? null,
        utm_source: utmSource,
        utm_medium: utmMedium,
        country: payload.country?.slice(0, 2) ?? null,
      });
    }
  } catch (error) {
    // Best-effort — don't fail the page load
    log.error('page view insert failed', { error: error instanceof Error ? error.message : String(error), path, sessionId });
    return errorResponse(API_ERRORS.INTERNAL, 500);
  }

  // Flush PostHog buffer outside the DB try-catch so a flush failure doesn't
  // return 500 when the page view was persisted successfully.
  try {
    await flushServerAnalytics();
  } catch {
    // Best-effort — analytics loss is acceptable, page view already recorded.
  }

  return Response.json({ ok: true });
}

export const POST = withLogging(rawPOST, 'pv');
