// Server-side PostHog client for emitting analytics events from API routes,
// webhooks, and server actions. Complements the client-side PostHog provider
// (components/posthog-provider.tsx) by enabling event capture where no browser
// context is available (e.g., Stripe webhooks, onboarding flows).
//
// Usage:
//   import { serverTrack, serverIdentify } from '@/lib/posthog-server';
//   serverTrack(userId, 'signup_completed', { referralCode: 'abc' });

import { PostHog } from 'posthog-node';

// Known server-side event names. Client-side events are defined separately
// in lib/analytics.ts — these are the events that can ONLY originate from
// the server (webhooks, session init, bout engine, etc.).
export type ServerAnalyticsEvent =
  | 'signup_completed'
  | 'user_activated'
  | 'subscription_started'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'subscription_churned'
  | 'credit_purchase_completed'
  | 'payment_failed'
  | 'session_started';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.POSTHOG_PRIVATE_API ??
  process.env.NEXT_PUBLIC_POSTHOG_HOST ??
  'https://us.i.posthog.com';
const SAMPLE_RATE = Math.min(
  1,
  Math.max(0, Number.parseFloat(process.env.POSTHOG_SAMPLE_RATE ?? '1') || 1),
);
const INTERNAL_DISTINCT_IDS = new Set(
  (process.env.POSTHOG_INTERNAL_DISTINCT_IDS ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
);

// Lazy singleton — avoids initializing when PostHog is not configured.
let _client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!POSTHOG_KEY) return null;
  if (_client) return _client;

  _client = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    // Flush events every 5 seconds or when 20 events are queued.
    flushAt: 20,
    flushInterval: 5000,
  });

  return _client;
}

function deterministicSampleKey(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash / 0xffffffff;
}

function shouldCaptureEvent(distinctId: string, event: ServerAnalyticsEvent): boolean {
  if (INTERNAL_DISTINCT_IDS.has(distinctId)) return false;
  if (SAMPLE_RATE >= 1) return true;
  return deterministicSampleKey(`${distinctId}:${event}`) <= SAMPLE_RATE;
}

/**
 * Capture a server-side analytics event.
 * Non-blocking — events are batched and flushed asynchronously.
 *
 * @param distinctId - The user's Clerk ID (or 'anonymous' for unauthenticated events)
 * @param event - Event name from the ServerAnalyticsEvent union
 * @param properties - Arbitrary event properties
 */
export function serverTrack(
  distinctId: string,
  event: ServerAnalyticsEvent,
  properties?: Record<string, string | number | boolean | null>,
): void {
  const client = getClient();
  if (!client) return;
  if (!shouldCaptureEvent(distinctId, event)) return;

  client.capture({
    distinctId,
    event,
    properties: {
      ...properties,
      $lib: 'posthog-node',
      source: 'server',
    },
  });
}

/**
 * Set persistent user properties on the PostHog person profile.
 * Useful for enriching user records with tier, signup date, etc.
 */
export function serverIdentify(
  distinctId: string,
  properties: Record<string, string | number | boolean | null>,
): void {
  const client = getClient();
  if (!client) return;

  client.identify({
    distinctId,
    properties,
  });
}

/**
 * Flush pending events. Call in Vercel serverless handlers before the
 * function terminates to ensure events are delivered.
 *
 * In long-running processes, the automatic flush interval handles delivery.
 */
export async function flushServerAnalytics(): Promise<void> {
  const client = getClient();
  if (!client) return;
  await client.flush();
}
