// Server-side PostHog client for emitting analytics events from API routes,
// webhooks, and server actions. Complements the client-side PostHog provider
// (components/posthog-provider.tsx) by enabling event capture where no browser
// context is available (e.g., Stripe webhooks, onboarding flows).
//
// IMPORTANT — Vercel serverless compatibility:
// PostHog's Node SDK docs explicitly recommend `captureImmediate()` over
// `capture()` in serverless environments like Vercel. The standard `capture()`
// wraps the event in an async `prepareEventMessage()` pipeline, and the SDK's
// `flush()` does NOT await pending promises (only `shutdown()` does). This
// means events queued via `capture()` can be lost when the function terminates.
//
// This module provides two tiers:
// - `serverTrack` / `serverIdentify`: use `captureImmediate` / `identifyImmediate`
//   for guaranteed delivery of one-shot lifecycle events.
// - `serverCaptureAIGeneration`: uses batched `capture()` for high-frequency
//   per-turn LLM analytics during bout streaming (latency-sensitive path).
//   These are drained by `flushServerAnalytics()` via `shutdown()`.
//
// @see https://posthog.com/docs/libraries/node#short-lived-processes-like-serverless-environments
//
// Usage:
//   import { serverTrack, serverIdentify } from '@/lib/posthog-server';
//   await serverTrack(userId, 'signup_completed', { referralCode: 'abc' });

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
  | 'session_started'
  | '$ai_generation'
  | 'short_link_clicked'
  // Bout lifecycle (OCE-283)
  | 'bout_started'
  | 'bout_completed'
  | 'bout_error'
  // Viral funnel (OCE-288)
  | 'referred_session_started';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

// Lazy singleton — avoids initializing when PostHog is not configured.
let _client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!POSTHOG_KEY) return null;
  if (_client) return _client;

  _client = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    // Batch settings for AI generation events (high-frequency per-turn).
    // One-shot lifecycle events bypass batching via captureImmediate().
    flushAt: 20,
    flushInterval: 5000,
  });

  return _client;
}

/**
 * Capture a server-side analytics event.
 *
 * Uses `captureImmediate()` per PostHog's serverless guidance — guarantees
 * the HTTP request finishes before the function continues. The standard
 * `capture()` method wraps events in an async `prepareEventMessage()` chain
 * that `flush()` cannot await (only `shutdown()` drains the promise queue),
 * causing silent event loss in Vercel serverless functions.
 *
 * @param distinctId - The user's Clerk ID (or 'anonymous' for unauthenticated events)
 * @param event - Event name from the ServerAnalyticsEvent union
 * @param properties - Arbitrary event properties
 */
export async function serverTrack(
  distinctId: string,
  event: ServerAnalyticsEvent,
  properties?: Record<string, string | number | boolean | null>,
): Promise<void> {
  const client = getClient();
  if (!client) return;

  await client.captureImmediate({
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
 * Uses `identifyImmediate()` for serverless compatibility.
 */
export async function serverIdentify(
  distinctId: string,
  properties: Record<string, string | number | boolean | null>,
): Promise<void> {
  const client = getClient();
  if (!client) return;

  await client.identifyImmediate({
    distinctId,
    properties,
  });
}

/**
 * Capture a PostHog $ai_generation event for LLM cost/token analytics.
 *
 * Uses PostHog's standard AI observability schema so generation data
 * appears in the built-in LLM analytics dashboard. This replaces the
 * Helicone proxy that was previously used for cost tracking.
 *
 * Uses batched `capture()` (not `captureImmediate`) because AI generation
 * events fire per-turn during bout streaming — awaiting each HTTP request
 * would add unacceptable latency. These are drained by the
 * `flushServerAnalytics()` call at the end of the bout via `shutdown()`,
 * which properly awaits the pending promise queue.
 *
 * @see https://posthog.com/docs/ai-engineering/observability
 */
export function serverCaptureAIGeneration(
  distinctId: string,
  params: {
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    inputCostUsd: number;
    outputCostUsd: number;
    totalCostUsd: number;
    durationMs: number;
    boutId: string;
    presetId: string;
    turn?: number;
    isByok: boolean;
    /** 'turn' for debate turns, 'share_line' for share line generation */
    generationType: 'turn' | 'share_line';
  },
): void {
  const client = getClient();
  if (!client) return;

  client.capture({
    distinctId,
    event: '$ai_generation',
    properties: {
      // PostHog standard $ai_generation fields
      $ai_model: params.model,
      $ai_provider: params.provider,
      $ai_input_tokens: params.inputTokens,
      $ai_output_tokens: params.outputTokens,
      $ai_input_cost_usd: params.inputCostUsd,
      $ai_output_cost_usd: params.outputCostUsd,
      $ai_total_cost_usd: params.totalCostUsd,
      $ai_latency: params.durationMs / 1000, // PostHog expects seconds
      $ai_is_error: false,
      // Custom properties for The Pit context
      bout_id: params.boutId,
      preset_id: params.presetId,
      turn: params.turn,
      is_byok: params.isByok,
      generation_type: params.generationType,
      $lib: 'posthog-node',
      source: 'server',
    },
  });
}

/**
 * Flush all pending events. Call in Vercel serverless handlers before the
 * function terminates to ensure events are delivered.
 *
 * Uses `shutdown()` instead of `flush()` because `shutdown()` calls
 * `promiseQueue.join()` which awaits all pending capture promises,
 * while `flush()` only drains the batch queue (missing any events still
 * in the async `prepareEventMessage()` pipeline from batched `capture()`
 * calls like `serverCaptureAIGeneration`).
 *
 * The singleton is re-created on next use after shutdown.
 */
export async function flushServerAnalytics(): Promise<void> {
  const client = getClient();
  if (!client) return;

  await client.shutdown();
  // Reset the singleton so subsequent calls in the same process
  // (e.g. long-running dev server) create a fresh client.
  _client = null;
}
