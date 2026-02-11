import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const REFERRAL_RE = /^[A-Za-z0-9_-]{1,32}$/;

export default clerkMiddleware((_, req) => {
  const referral = req.nextUrl.searchParams.get('ref');
  if (!referral || !REFERRAL_RE.test(referral)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Only set referral cookie if one doesn't already exist (prevent attribution theft).
  if (response.cookies.get('pit_ref')) {
    return response;
  }

  response.cookies.set('pit_ref', referral, {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
