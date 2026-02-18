// Client-side analytics event tracker.
//
// Provides a typed trackEvent() function for capturing product analytics
// events to PostHog. When PostHog is not configured, events are silently
// dropped.
//
// Usage:
//   import { trackEvent } from '@/lib/analytics';
//   trackEvent('bout_started', { presetId: 'roast-battle', model: 'haiku' });

'use client';

import posthog from 'posthog-js';

type EventProperties = Record<string, string | number | boolean | null>;

// Known event names for type safety. Extend as new events are added.
export type AnalyticsEvent =
  | 'bout_started'
  | 'bout_completed'
  | 'bout_error'
  | 'bout_shared'
  | 'agent_created'
  | 'agent_cloned'
  | 'reaction_submitted'
  | 'winner_voted'
  | 'credit_purchase_initiated'
  | 'preset_selected'
  | 'byok_key_stashed'
  | 'paper_submitted'
  | 'feature_request_submitted'
  | 'feature_request_voted'
  | 'page_scroll_depth'
  | 'page_active_time'
  | 'bout_engagement_depth'
  | 'copy_variant_served'
  // Discovery events (OCE-256)
  | 'leaderboard_viewed'
  | 'agents_browsed'
  | 'preset_browsed'
  | 'bout_replayed'
  // Revenue funnel (OCE-287)
  | 'paywall_hit'
  | 'upgrade_cta_clicked'
  // Acquisition funnel (OCE-285)
  | 'consent_granted'
  | 'consent_declined'
  | 'arena_viewed';

export function trackEvent(event: AnalyticsEvent, properties?: EventProperties) {
  if (typeof window === 'undefined') return;

  try {
    if (posthog.__loaded) {
      posthog.capture(event, properties);
    }
  } catch {
    // PostHog not available — silently drop
  }
}
