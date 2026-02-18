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
  // Core bout flow
  | 'bout_started'
  | 'bout_completed'
  | 'bout_error'
  | 'bout_shared'
  // Product creation / interaction
  | 'agent_created'
  | 'agent_cloned'
  | 'reaction_submitted'
  | 'winner_voted'
  // Revenue funnel
  | 'credit_purchase_initiated'
  | 'checkout_initiated'
  | 'subscription_checkout_initiated'
  | 'billing_portal_opened'
  | 'paywall_viewed'
  // Acquisition + activation
  | 'arena_viewed'
  | 'consent_accepted'
  | 'consent_declined'
  | 'referral_captured'
  | 'preset_selected'
  | 'byok_key_stashed'
  | 'paper_submitted'
  | 'feature_request_submitted'
  | 'feature_request_voted'
  // Engagement
  | 'page_scroll_depth'
  | 'page_active_time'
  | 'bout_engagement_depth'
  | 'copy_variant_served'
  // Viral + discovery
  | 'short_link_created'
  | 'short_link_clicked'
  // Discovery events (OCE-256)
  | 'leaderboard_viewed'
  | 'agents_browsed'
  | 'preset_browsed'
  | 'bout_replayed';

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
