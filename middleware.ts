import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { resolveClientIp } from '@/lib/ip';
import {
  COPY_VARIANT_HEADER,
  VARIANT_COOKIE,
  selectVariant,
  getExperimentConfig,
  isExcludedPath,
} from '@/lib/copy-edge';

const REFERRAL_RE = /^[A-Za-z0-9_-]{1,32}$/;

/** Session cookie name for page-view analytics. */
const SESSION_COOKIE = 'pit_sid';
const SESSION_MAX_AGE = 30 * 60; // 30 minutes rolling

/** Variant cookie max age — 30 days. */
const VARIANT_MAX_AGE = 60 * 60 * 24 * 30;

/** Allowed variant name pattern — alphanumeric + hyphens, max 32 chars. */
const VARIANT_RE = /^[a-z0-9-]{1,32}$/;

/** UTM parameters we capture from query strings. */
const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
const UTM_COOKIE = 'pit_utm';
const UTM_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Paths that should NOT record page views (API routes, static assets,
 * and internal Next.js paths are already excluded by the matcher, but
 * these catch remaining non-page routes).
 */
const SKIP_PAGE_VIEW_RE = /^\/(api|trpc|_next|s)\//;

export default clerkMiddleware(async (clerkAuth, req) => {
  // Generate a unique request ID for tracing across logs.
  // Propagated to route handlers via the x-request-id header.
  const requestId = nanoid(12);

  const referral = req.nextUrl.searchParams.get('ref');

  // ---------------------------------------------------------------------------
  // Forensic header propagation — forward client metadata to route handlers
  // ---------------------------------------------------------------------------
  const headers = new Headers(req.headers);
  headers.set('x-request-id', requestId);

  // Propagate client IP for logging (not stored raw — hashed downstream).
  // Uses the canonical resolveClientIp() which prefers the trusted rightmost
  // x-forwarded-for entry, consistent with rate limiting in lib/rate-limit.ts.
  const clientIp = resolveClientIp(req.headers);
  if (clientIp && clientIp !== 'unknown') {
    headers.set('x-client-ip', clientIp);
  }

  // Vercel provides geo headers — propagate country for analytics
  const country = req.headers.get('x-vercel-ip-country') ?? '';
  if (country) {
    headers.set('x-client-country', country);
  }

  const pathname = req.nextUrl.pathname;

  // ---------------------------------------------------------------------------
  // Copy variant assignment — A/B testing
  // ---------------------------------------------------------------------------
  // Assigns a copy variant to each visitor via sticky cookie. The variant
  // determines which JSON copy file is used for all user-facing text.
  //
  // Assignment priority:
  //   1. ?variant=xyz query param (QA override, takes precedence)
  //   2. Existing pit_variant cookie (sticky assignment)
  //   3. Weighted random assignment from experiment.json
  //
  // IMPORTANT: The variant header MUST be set on the request headers BEFORE
  // calling NextResponse.next(), because Next.js serializes request headers
  // at that point. Cookie writes happen on the response object after.
  const experimentConfig = getExperimentConfig();
  let copyVariant: string;
  let variantCookieToSet: string | null = null;

  // Priority 1: URL override for QA/testing
  const variantOverride = req.nextUrl.searchParams.get('variant');
  if (variantOverride && VARIANT_RE.test(variantOverride) && variantOverride in experimentConfig.variants) {
    copyVariant = variantOverride;
    variantCookieToSet = copyVariant;
  } else {
    // Priority 2: Existing cookie
    const existingVariant = req.cookies.get(VARIANT_COOKIE)?.value;
    if (existingVariant && VARIANT_RE.test(existingVariant) && existingVariant in experimentConfig.variants) {
      copyVariant = existingVariant;
    } else if (experimentConfig.active && !isExcludedPath(pathname)) {
      // Priority 3: Weighted random assignment
      copyVariant = selectVariant();
      variantCookieToSet = copyVariant;
    } else {
      copyVariant = experimentConfig.defaultVariant;
    }
  }

  // Propagate variant to server components via request header.
  // This MUST happen before NextResponse.next() — headers are captured at that point.
  headers.set(COPY_VARIANT_HEADER, copyVariant);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set('x-request-id', requestId);

  // Write variant cookie on the response (only when assignment changed).
  if (variantCookieToSet) {
    response.cookies.set(VARIANT_COOKIE, variantCookieToSet, {
      maxAge: VARIANT_MAX_AGE,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  // ---------------------------------------------------------------------------
  // Referral cookie — first-touch attribution
  // ---------------------------------------------------------------------------
  if (referral && REFERRAL_RE.test(referral) && !req.cookies.get('pit_ref')) {
    response.cookies.set('pit_ref', referral, {
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  // ---------------------------------------------------------------------------
  // Analytics consent gate
  // ---------------------------------------------------------------------------
  // Analytics cookies (pit_utm, pit_sid) and page view recording are only
  // active when the user has accepted analytics cookies via the consent banner.
  // Essential cookies (pit_ref for referral attribution, Clerk auth) are always set.
  const hasAnalyticsConsent = req.cookies.get('pit_consent')?.value === 'accepted';

  // ---------------------------------------------------------------------------
  // UTM cookie — first-touch campaign attribution (requires consent)
  // ---------------------------------------------------------------------------
  if (hasAnalyticsConsent && !req.cookies.get(UTM_COOKIE)) {
    const utmValues: Record<string, string> = {};
    let hasUtm = false;
    for (const param of UTM_PARAMS) {
      const value = req.nextUrl.searchParams.get(param);
      if (value) {
        utmValues[param] = value.slice(0, 128);
        hasUtm = true;
      }
    }
    if (hasUtm) {
      response.cookies.set(UTM_COOKIE, JSON.stringify(utmValues), {
        maxAge: UTM_MAX_AGE,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Session cookie — rolling 30-min session for page view grouping (requires consent)
  // ---------------------------------------------------------------------------
  let sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  if (hasAnalyticsConsent) {
    if (!sessionId) {
      sessionId = nanoid(16);
    }
    // Always re-set to extend the rolling TTL
    response.cookies.set(SESSION_COOKIE, sessionId, {
      maxAge: SESSION_MAX_AGE,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      httpOnly: true,
    });
  }

  // ---------------------------------------------------------------------------
  // Page view recording — fire-and-forget to /api/pv internal endpoint (requires consent)
  // ---------------------------------------------------------------------------
  const pvSecret = process.env.PV_INTERNAL_SECRET;
  if (hasAnalyticsConsent && pvSecret && !SKIP_PAGE_VIEW_RE.test(pathname) && req.method === 'GET') {
    // We record page views via a lightweight internal API endpoint rather than
    // importing DB code into edge middleware (which has runtime constraints).
    const pvUrl = new URL('/api/pv', req.url);
    const referrer = req.headers.get('referer') ?? ''; // HTTP header is historically misspelled
    const userAgent = req.headers.get('user-agent') ?? '';
    const utmCookie = req.cookies.get(UTM_COOKIE)?.value ?? '';

    // Resolve userId from Clerk session — Clerk has already authenticated by
    // this point so this is a fast synchronous-ish lookup (no network call).
    const authState = await clerkAuth();
    const pvUserId = authState.userId ?? undefined;

    // Fire-and-forget — do not await, do not block the response.
    // AbortController ensures the fetch does not hang indefinitely.
    const pvAbort = new AbortController();
    const pvTimeout = setTimeout(() => pvAbort.abort(), 5_000);
    fetch(pvUrl.toString(), {
      method: 'POST',
      signal: pvAbort.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
        'x-pv-secret': pvSecret,
      },
      body: JSON.stringify({
        path: pathname,
        sessionId,
        clientIp,
        referrer,
        userAgent,
        country,
        utm: utmCookie,
        userId: pvUserId,
        copyVariant,
      }),
    }).catch(() => {
      // Silently drop — page views are best-effort analytics
    }).finally(() => clearTimeout(pvTimeout));
  }

  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
