'use client';

import { useSyncExternalStore, useCallback, useState } from 'react';
import Link from 'next/link';
import { useCopy } from '@/lib/copy-client';

/** Cookie name storing the user's analytics consent choice. */
export const CONSENT_COOKIE = 'pit_consent';

type ConsentState = 'pending' | 'accepted' | 'declined';

/**
 * Read the current consent state from the pit_consent cookie.
 * Returns 'pending' if no decision has been recorded.
 */
export function getConsentState(): ConsentState {
  if (typeof document === 'undefined') return 'pending';
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return 'pending';
  const value = match.split('=')[1];
  if (value === 'accepted') return 'accepted';
  if (value === 'declined') return 'declined';
  return 'pending';
}

/** Persist the consent decision as a first-party cookie (1 year). */
function setConsentCookie(state: 'accepted' | 'declined') {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `${CONSENT_COOKIE}=${state}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/** Server snapshot always returns 'pending' (no cookies available). */
function getServerSnapshot(): ConsentState {
  return 'pending';
}

/**
 * Cookie consent banner for UK GDPR compliance.
 *
 * Gates PostHog analytics and custom analytics cookies (pit_sid, pit_utm)
 * behind explicit user consent. Essential cookies (auth, referral) are
 * always set as they are necessary for site functionality.
 */
export function CookieConsent() {
  const c = useCopy();
  // Use a counter to force re-reads of the cookie after user action
  const [, setVersion] = useState(0);

  const subscribe = useCallback((onStoreChange: () => void) => {
    // No external subscription needed — we manually trigger via setVersion
    // Return a no-op unsubscribe
    void onStoreChange;
    return () => {};
  }, []);

  const state = useSyncExternalStore(subscribe, getConsentState, getServerSnapshot);

  // Don't render if consent has already been recorded
  if (state !== 'pending') return null;

  const handleAccept = () => {
    setConsentCookie('accepted');
    setVersion((v) => v + 1);
    // Reload to allow PostHog to initialize and middleware to set analytics cookies
    window.location.reload();
  };

  const handleDecline = () => {
    setConsentCookie('declined');
    setVersion((v) => v + 1);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-foreground/60 bg-background/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-sm text-foreground">
            {c.cookieConsent.message}
          </p>
          <p className="mt-1 text-xs text-muted">
            {c.cookieConsent.essential}{' '}
            <Link href="/privacy" className="underline transition hover:text-accent">
              {c.cookieConsent.privacyLink}
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={handleDecline}
            className="border-2 border-foreground/40 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-muted transition hover:border-foreground hover:text-foreground"
          >
            {c.cookieConsent.decline}
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="border-2 border-accent bg-accent px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-background transition hover:bg-accent/90"
          >
            {c.cookieConsent.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
