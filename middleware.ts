import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

const REFERRAL_RE = /^[A-Za-z0-9_-]{1,32}$/;

/** Session cookie name for page-view analytics. */
const SESSION_COOKIE = 'pit_sid';
const SESSION_MAX_AGE = 30 * 60; // 30 minutes rolling

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

export default clerkMiddleware((_, req) => {
  // Generate a unique request ID for tracing across logs.
  // Propagated to route handlers via the x-request-id header.
  const requestId = nanoid(12);

  const referral = req.nextUrl.searchParams.get('ref');

  // ---------------------------------------------------------------------------
  // Forensic header propagation — forward client metadata to route handlers
  // ---------------------------------------------------------------------------
  const headers = new Headers(req.headers);
  headers.set('x-request-id', requestId);

  // Propagate client IP for logging (not stored raw — hashed downstream)
  const forwarded = req.headers.get('x-forwarded-for');
  const clientIp = forwarded
    ? forwarded.split(',')[0].trim()
    : (req.headers.get('x-real-ip') ?? '');
  if (clientIp) {
    headers.set('x-client-ip', clientIp);
  }

  // Vercel provides geo headers — propagate country for analytics
  const country = req.headers.get('x-vercel-ip-country') ?? '';
  if (country) {
    headers.set('x-client-country', country);
  }

  const response = NextResponse.next({ request: { headers } });
  response.headers.set('x-request-id', requestId);

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
  // UTM cookie — first-touch campaign attribution
  // ---------------------------------------------------------------------------
  if (!req.cookies.get(UTM_COOKIE)) {
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
  // Session cookie — rolling 30-min session for page view grouping
  // ---------------------------------------------------------------------------
  let sessionId = req.cookies.get(SESSION_COOKIE)?.value;
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

  // ---------------------------------------------------------------------------
  // Page view recording — fire-and-forget to /api/pv internal endpoint
  // ---------------------------------------------------------------------------
  const pathname = req.nextUrl.pathname;
  if (!SKIP_PAGE_VIEW_RE.test(pathname) && req.method === 'GET') {
    // We record page views via a lightweight internal API endpoint rather than
    // importing DB code into edge middleware (which has runtime constraints).
    const pvUrl = new URL('/api/pv', req.url);
    const referer = req.headers.get('referer') ?? '';
    const userAgent = req.headers.get('user-agent') ?? '';
    const utmCookie = req.cookies.get(UTM_COOKIE)?.value ?? '';

    // Fire-and-forget — do not await, do not block the response
    fetch(pvUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
        'x-pv-secret': process.env.PV_INTERNAL_SECRET ?? '',
      },
      body: JSON.stringify({
        path: pathname,
        sessionId,
        clientIp,
        referer,
        userAgent,
        country,
        utm: utmCookie,
      }),
    }).catch(() => {
      // Silently drop — page views are best-effort analytics
    });
  }

  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
