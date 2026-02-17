'use client';

// Lightweight client component that fires a single analytics event on mount.
// Used by server-rendered pages to track discovery/browse events (OCE-256).
//
// Usage:
//   <TrackPageEvent event="leaderboard_viewed" />
//   <TrackPageEvent event="bout_replayed" properties={{ boutId: '...' }} />

import { useEffect, useRef } from 'react';
import { trackEvent, type AnalyticsEvent } from '@/lib/analytics';

export function TrackPageEvent({
  event,
  properties,
}: {
  event: AnalyticsEvent;
  properties?: Record<string, string | number | boolean | null>;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent(event, properties);
  }, [event, properties]);

  return null;
}
