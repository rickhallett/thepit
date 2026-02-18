/**
 * Request-scoped context via AsyncLocalStorage.
 *
 * Provides implicit access to request metadata (requestId, clientIp, userId)
 * anywhere in the call stack without manually threading parameters through
 * every function.
 *
 * Usage:
 *   // In a route handler or middleware wrapper:
 *   import { requestStore, type RequestContext } from '@/lib/async-context';
 *   requestStore.run({ requestId, clientIp }, async () => {
 *     await handler(req);
 *   });
 *
 *   // Anywhere downstream (deeply nested function, logger, etc.):
 *   import { getContext } from '@/lib/async-context';
 *   const ctx = getContext();
 *   log.info('event', { requestId: ctx?.requestId });
 *
 * AsyncLocalStorage is available in Node.js 16+ and Vercel Edge Runtime.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContext = {
  requestId: string;
  clientIp: string;
  userId?: string;
  sessionId?: string;
  /** ISO 3166-1 alpha-2 country code from Vercel edge (x-vercel-ip-country). */
  country?: string;
  /** Client User-Agent string (truncated to 200 chars). */
  userAgent?: string;
  /** Request pathname (e.g. /api/run-bout). */
  path?: string;
  /** Active copy A/B testing variant (e.g. 'control', 'hype', 'precise'). */
  copyVariant?: string;
};

/**
 * Singleton store for the current request's context.
 * Each concurrent request gets its own isolated store via `.run()`.
 */
export const requestStore = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context, or undefined if called outside a
 * `requestStore.run()` scope (e.g., during module initialization or
 * in a background task).
 */
export function getContext(): RequestContext | undefined {
  return requestStore.getStore();
}
