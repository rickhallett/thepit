// LangSmith tracing integration for the Vercel AI SDK.
//
// Provides traced versions of `streamText` and `generateText` that
// automatically emit spans to LangSmith when LANGSMITH_ENABLED is true.
//
// Architecture:
//   - Uses `wrapAISDK()` from `langsmith/experimental/vercel` to wrap
//     the AI SDK module lazily on first call (singleton, not per-call).
//   - Exports both traced and untraced variants. The bout engine uses
//     `tracedStreamText` for platform calls and `untracedStreamText`
//     for BYOK calls (user keys must not be sent to our LangSmith project).
//   - The LangSmith `Client` singleton is shared across tracing and
//     serverless flush (OCE-94).
//
// When LANGSMITH_ENABLED is false, the traced exports are identity
// pass-throughs to the original AI SDK functions — zero overhead.
//
// Static `import * as ai` ensures vitest mock interception works. Property
// access is deferred to call time so wrapAISDK can wrap lazily.

import * as ai from 'ai';

import { log } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Feature flag — read once at module load
// ---------------------------------------------------------------------------

const LANGSMITH_ENABLED = process.env.LANGSMITH_ENABLED === 'true';

// ---------------------------------------------------------------------------
// LangSmith Client singleton
// ---------------------------------------------------------------------------

// Lazy-initialized to avoid importing langsmith when disabled.
// The Client handles batching and network I/O for trace export.
let _client: import('langsmith').Client | null = null;

/**
 * Get the shared LangSmith Client instance.
 * Returns null when LangSmith is disabled.
 *
 * Used by:
 *   - This module (wrapAISDK config)
 *   - OCE-94 route handlers for `awaitPendingTraceBatches()` flush
 */
export function getLangSmithClient(): import('langsmith').Client | null {
  if (!LANGSMITH_ENABLED) return null;

  if (!_client) {
    // Dynamic import would be cleaner but Client is needed synchronously
    // for wrapAISDK. The langsmith package is tree-shaken when disabled
    // because this code path is unreachable.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require('langsmith') as typeof import('langsmith');
    _client = new Client({
      // API key and project are read from LANGSMITH_API_KEY and
      // LANGSMITH_PROJECT env vars by the SDK automatically.
    });
    log.info('LangSmith client initialized', {
      project: process.env.LANGSMITH_PROJECT ?? 'default',
    });
  }

  return _client;
}

// ---------------------------------------------------------------------------
// Wrapped AI SDK functions
// ---------------------------------------------------------------------------

// When enabled, wrap the AI SDK module once at first call.
// wrapAISDK returns an object with the same shape as `import * as ai`.
let _wrapped: typeof ai | null = null;

function getWrappedAI(): typeof ai {
  if (_wrapped) return _wrapped;

  if (!LANGSMITH_ENABLED) {
    _wrapped = ai;
    return _wrapped;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { wrapAISDK } = require('langsmith/experimental/vercel') as typeof import('langsmith/experimental/vercel');
  // Pass the shared client so wrapAISDK traces use the same batching queue
  // as our explicit traceable() calls. Without this, awaitPendingTraceBatches()
  // on the shared client would not flush traces from wrapAISDK.
  _wrapped = wrapAISDK(ai, {
    client: getLangSmithClient() ?? undefined,
    metadata: { service: 'tspit' },
  });
  log.info('AI SDK wrapped with LangSmith tracing');
  return _wrapped;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Traced `streamText` — emits LLM spans to LangSmith.
 * Use for platform-funded calls. BYOK calls should use `untracedStreamText`.
 */
export const tracedStreamText: typeof ai.streamText = ((...args: Parameters<typeof ai.streamText>) =>
  getWrappedAI().streamText(...args)) as typeof ai.streamText;

/**
 * Traced `generateText` — emits LLM spans to LangSmith.
 * Use for platform-funded calls.
 */
export const tracedGenerateText: typeof ai.generateText = ((...args: Parameters<typeof ai.generateText>) =>
  getWrappedAI().generateText(...args)) as typeof ai.generateText;

/**
 * Untraced `streamText` — bypasses LangSmith entirely.
 * Use for BYOK calls where user API keys must not be logged to our project.
 *
 * Delegates to `ai.streamText` at call time (not import time) so that
 * vitest mocks are resolved correctly.
 */
export const untracedStreamText: typeof ai.streamText = ((...args: Parameters<typeof ai.streamText>) =>
  ai.streamText(...args)) as typeof ai.streamText;

/**
 * Untraced `generateText` — bypasses LangSmith entirely.
 */
export const untracedGenerateText: typeof ai.generateText = ((...args: Parameters<typeof ai.generateText>) =>
  ai.generateText(...args)) as typeof ai.generateText;

// ---------------------------------------------------------------------------
// traceable wrapper helpers
// ---------------------------------------------------------------------------

// Lazy-load traceable to avoid importing langsmith when disabled.
let _traceable: typeof import('langsmith/traceable').traceable | null = null;

function getTraceable(): typeof import('langsmith/traceable').traceable {
  if (_traceable) return _traceable;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('langsmith/traceable') as typeof import('langsmith/traceable');
  _traceable = mod.traceable;
  return _traceable;
}

/**
 * Wrap an async function with LangSmith `traceable()` when enabled.
 * When disabled, returns the original function unchanged.
 *
 * @param fn - The function to wrap
 * @param config - LangSmith trace config (name, metadata, tags, etc.)
 * @returns The original function (disabled) or a traced wrapper (enabled)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withTracing<F extends (...args: any[]) => any>(
  fn: F,
  config: {
    name: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
    run_type?: string;
  },
): F {
  if (!LANGSMITH_ENABLED) return fn;
  return getTraceable()(fn, {
    ...config,
    client: getLangSmithClient() ?? undefined,
  }) as unknown as F;
}
