'use client';

// PostHog analytics provider.
//
// Wraps the app in a PostHog context for automatic page view tracking
// and custom event capture. Only initializes when NEXT_PUBLIC_POSTHOG_KEY
// is set — completely inert in development or when unconfigured.
//
// UTM parameters from the pit_utm cookie are registered as super properties
// so they persist across all events in the session.

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

if (typeof window !== 'undefined' && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // We capture manually for SPA navigation
    capture_pageleave: true,
    persistence: 'localStorage', // Avoid third-party cookie warnings
    autocapture: true,
    capture_dead_clicks: true,
    disable_session_recording: false,
    // Respect Do Not Track browser setting
    respect_dnt: true,
  });

  // Register UTM super properties from the pit_utm cookie so they persist
  // across all events in the session without re-reading the cookie each time.
  try {
    const utmCookie = document.cookie
      .split('; ')
      .find((c) => c.startsWith('pit_utm='));
    if (utmCookie) {
      const utm = JSON.parse(decodeURIComponent(utmCookie.split('=')[1]));
      const superProps: Record<string, string> = {};
      if (utm.utm_source) superProps.utm_source = utm.utm_source;
      if (utm.utm_medium) superProps.utm_medium = utm.utm_medium;
      if (utm.utm_campaign) superProps.utm_campaign = utm.utm_campaign;
      if (utm.utm_term) superProps.utm_term = utm.utm_term;
      if (utm.utm_content) superProps.utm_content = utm.utm_content;
      if (Object.keys(superProps).length > 0) {
        posthog.register(superProps);
      }
    }
  } catch {
    // Malformed cookie — ignore
  }
}

/** Sync Clerk auth state with PostHog identity. */
function PostHogIdentify() {
  const { userId, isSignedIn } = useAuth();
  const ph = usePostHog();

  useEffect(() => {
    if (!ph) return;
    if (isSignedIn && userId) {
      ph.identify(userId);
    } else if (isSignedIn === false) {
      ph.reset();
    }
  }, [ph, userId, isSignedIn]);

  return null;
}

/** Track SPA page views on route change. */
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!pathname || !ph) return;
    const url = `${window.origin}${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
    ph.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <PostHogIdentify />
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
