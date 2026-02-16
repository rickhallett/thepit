'use client';

// PostHog analytics provider.
//
// Wraps the app in a PostHog context for automatic page view tracking
// and custom event capture. Only initializes when:
//   1. NEXT_PUBLIC_POSTHOG_KEY is set
//   2. The user has accepted analytics cookies (pit_consent=accepted)
//
// UTM parameters from the pit_utm cookie are registered as super properties
// so they persist across all events in the session.

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

import { getConsentState } from '@/components/cookie-consent';
import { getExperimentConfig } from '@/lib/copy-edge';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

/**
 * Initialize PostHog only when the user has consented to analytics cookies.
 * Called once on mount and guards against double-init.
 */
function initPostHog() {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return;
  if (getConsentState() !== 'accepted') return;
  if (posthog.__loaded) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // We capture manually for SPA navigation
    capture_pageleave: true,
    persistence: 'localStorage', // Avoid third-party cookie warnings
    autocapture: true,
    capture_dead_clicks: true,
    disable_session_recording: false,
    // Respect Do Not Track browser setting.
    // TRADEOFF: ~12-15% of browsers send the DNT header (Safari defaults it on,
    // Firefox/Brave users enable it). These users will be completely invisible
    // to PostHog — no events, no sessions, no funnels. This is an intentional
    // privacy-first choice, but means analytics undercount real traffic.
    // If accurate volume metrics are critical, consider setting this to false
    // and relying on PostHog's own consent/opt-out mechanisms instead.
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

  // Register copy A/B variant as a super property so every PostHog event
  // (page views, bout starts, votes, engagement) is tagged with the variant.
  // Only register if the experiment is active and the cookie value is a known
  // variant — prevents stale/tampered cookies from polluting analytics.
  try {
    const expConfig = getExperimentConfig();
    if (expConfig.active) {
      const variantCookie = document.cookie
        .split('; ')
        .find((c) => c.startsWith('pit_variant='));
      if (variantCookie) {
        const raw = variantCookie.substring(variantCookie.indexOf('=') + 1);
        const variant = decodeURIComponent(raw).trim();
        if (variant && variant in expConfig.variants) {
          posthog.register({ copy_variant: variant });
        }
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
  useEffect(() => {
    initPostHog();
  }, []);

  if (!POSTHOG_KEY || (typeof window !== 'undefined' && getConsentState() !== 'accepted')) {
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
