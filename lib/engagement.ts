'use client';

// Client-side engagement tracking utilities.
//
// Provides scroll depth milestone tracking, active time measurement,
// and bout engagement depth tracking. All events are fired to PostHog
// via the shared trackEvent() function.

import { trackEvent } from '@/lib/analytics';

// ---------------------------------------------------------------------------
// Scroll depth tracking
// ---------------------------------------------------------------------------

const SCROLL_MILESTONES = [25, 50, 75, 100] as const;
const firedMilestones = new Set<number>();

/**
 * Initialize scroll depth tracking for the current page.
 * Fires `page_scroll_depth` events at 25%, 50%, 75%, and 100% milestones.
 * Call once per page — milestones reset on navigation.
 */
export function initScrollDepthTracking(): () => void {
  firedMilestones.clear();

  const handler = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;

    const percent = Math.round((scrollTop / docHeight) * 100);

    for (const milestone of SCROLL_MILESTONES) {
      if (percent >= milestone && !firedMilestones.has(milestone)) {
        firedMilestones.add(milestone);
        trackEvent('page_scroll_depth', {
          depth: milestone,
          path: window.location.pathname,
        });
      }
    }
  };

  window.addEventListener('scroll', handler, { passive: true });
  return () => window.removeEventListener('scroll', handler);
}

// ---------------------------------------------------------------------------
// Active time tracking
// ---------------------------------------------------------------------------

/**
 * Track how long the user is actively viewing the page.
 * Uses the Page Visibility API to distinguish active vs. idle time.
 * Fires `page_active_time` on page unload/visibility hidden.
 *
 * Returns a cleanup function to stop tracking.
 */
export function initActiveTimeTracking(): () => void {
  let activeMs = 0;
  let lastActiveAt = Date.now();
  let isVisible = !document.hidden;

  const onVisibilityChange = () => {
    const now = Date.now();
    if (isVisible) {
      // Was visible, now hidden — accumulate active time
      activeMs += now - lastActiveAt;
    } else {
      // Was hidden, now visible — reset active start
      lastActiveAt = now;
    }
    isVisible = !document.hidden;
  };

  let flushed = false;
  const flushActiveTime = () => {
    if (flushed) return;
    flushed = true;
    if (isVisible) {
      activeMs += Date.now() - lastActiveAt;
    }
    if (activeMs > 1000) {
      // Only report if at least 1 second of active time
      trackEvent('page_active_time', {
        activeSeconds: Math.round(activeMs / 1000),
        path: window.location.pathname,
      });
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('beforeunload', flushActiveTime);

  return () => {
    // Flush on SPA navigation (beforeunload does not fire on client-side route changes)
    flushActiveTime();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('beforeunload', flushActiveTime);
  };
}

// ---------------------------------------------------------------------------
// Bout engagement depth
// ---------------------------------------------------------------------------

export type BoutEngagement = {
  turnsWatched: number;
  reactionsGiven: number;
  /** Whether the user cast a winner vote during this bout session. */
  votesCast: boolean;
};

/**
 * Fire a bout engagement depth event. Call on bout page unmount.
 */
export function trackBoutEngagement(boutId: string, engagement: BoutEngagement): void {
  trackEvent('bout_engagement_depth', {
    boutId,
    turnsWatched: engagement.turnsWatched,
    reactionsGiven: engagement.reactionsGiven,
    votesCast: engagement.votesCast,
  });
}
