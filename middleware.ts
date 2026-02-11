import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

const REFERRAL_RE = /^[A-Za-z0-9_-]{1,32}$/;

export default clerkMiddleware((_, req) => {
  // Generate a unique request ID for tracing across logs.
  // Propagated to route handlers via the x-request-id header.
  const requestId = nanoid(12);

  const referral = req.nextUrl.searchParams.get('ref');

  const headers = new Headers(req.headers);
  headers.set('x-request-id', requestId);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set('x-request-id', requestId);

  // Only set referral cookie for valid codes and when one doesn't already exist.
  if (referral && REFERRAL_RE.test(referral) && !req.cookies.get('pit_ref')) {
    response.cookies.set('pit_ref', referral, {
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
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
