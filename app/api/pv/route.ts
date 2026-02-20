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
import { errorResponse, parseValidBody, API_ERRORS } from '@/lib/api-utils';
import { pageViewSchema } from '@/lib/api-schemas';
import { withLogging } from '@/lib/api-logging';
import { serverTrack } from '@/lib/posthog-server';

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

  const parsed = await parseValidBody(req, pageViewSchema);
  if (parsed.error) return parsed.error;
  const payload = parsed.data;

  const { path, sessionId } = payload;

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
    // serverTrack uses captureImmediate — completes HTTP request before returning.
    if (payload.isNewSession) {
      const distinctId = userId ?? `anon_${sessionId}`;
      await serverTrack(distinctId, 'session_started', {
        visit_number: payload.visitNumber ?? 1,
        days_since_last_visit: payload.daysSinceLastVisit ?? null,
        landing_page: path,
        referrer: payload.referrer?.slice(0, 256) ?? null,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_term: utmTerm,
        utm_content: utmContent,
        country: payload.country?.slice(0, 2) ?? null,
      });

      // --- Analytics: referred_session_started (OCE-288) ---
      // Fire on each new session where pit_ref cookie is present. Fires per-session
      // (not once-per-user) since the cookie persists 30 days across sessions.
      const referralCode = typeof payload.referralCode === 'string' ? payload.referralCode.slice(0, 64) : null;
      if (referralCode) {
        await serverTrack(distinctId, 'referred_session_started', {
          referral_code: referralCode,
          landing_page: path,
          referrer: payload.referrer?.slice(0, 256) ?? null,
        });
      }
    }
  } catch (error) {
    // Best-effort — don't fail the page load
    log.error('page view insert failed', { error: error instanceof Error ? error.message : String(error), path, sessionId });
    return errorResponse(API_ERRORS.INTERNAL, 500);
  }

  return Response.json({ ok: true });
}

export const POST = withLogging(rawPOST, 'pv');
