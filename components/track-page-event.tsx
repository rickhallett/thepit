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

  // Fire-once on mount. We deliberately use an empty dep array because:
  // 1. The `fired` ref already prevents duplicate fires.
  // 2. `properties` is typically an inline object literal whose reference
  //    changes every render, but we only want the initial values.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent(event, properties);
  }, []);

  return null;
}
