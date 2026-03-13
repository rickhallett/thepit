'use client';

// Consent-gated Vercel Analytics wrapper.
//
// UK GDPR/PECR requires explicit consent before setting analytics cookies.
// This component only renders the Vercel Analytics component when the user
// has accepted analytics cookies (pit_consent=accepted).

import { Analytics } from '@vercel/analytics/react';
import { useSyncExternalStore } from 'react';

import { getConsentState } from '@/components/cookie-consent';

/** Server snapshot always returns 'pending' (no cookies available). */
function getServerSnapshot() {
  return 'pending' as const;
}

/** No-op subscribe - we don't need reactivity, just hydration match. */
function subscribe() {
  return () => {};
}

/**
 * Vercel Analytics gated behind cookie consent.
 *
 * Only loads the analytics script when pit_consent=accepted.
 * This ensures GDPR/PECR compliance by not tracking users who
 * have not consented or who have declined.
 */
export function VercelAnalytics() {
  const consentState = useSyncExternalStore(subscribe, getConsentState, getServerSnapshot);

  if (consentState !== 'accepted') {
    return null;
  }

  return <Analytics />;
}
