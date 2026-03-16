// API route logging wrapper for observability.
//
// Wraps Next.js API route handlers with automatic request/response
// logging, timing, request ID propagation, and forensic context
// (client IP, user agent, referer).

// @review(L2-E1) withLogging is the load-bearing API infrastructure. 20/20 routes use it.
//   Provides: structured logging, AsyncLocalStorage context injection, anomaly detection.
//   If a route skips this wrapper, all downstream requestStore.getStore() calls return
//   undefined. Invisible coupling that would break silently.
//   [severity:sound] [domain:api] [connects:L2-E2,L3-F3]

import { toError } from '@/lib/errors';
import { log } from '@/lib/logger';
import { getRequestId, getClientIp, getUserAgent, getReferer } from '@/lib/request-context';
import { checkAnomaly } from '@/lib/anomaly';
import { requestStore } from '@/lib/async-context';

type RouteHandler = (req: Request) => Promise<Response> | Response;

/**
 * Wrap an API route handler with structured request/response logging.
 *
 * Logs:
 *   - START: method, path, requestId, clientIp, userAgent, referer
 *   - END:   status, durationMs, requestId
 *   - ERROR: status, error message, requestId (for 5xx responses)
 *
 * Also feeds request/response data to the anomaly detector.
 */
export function withLogging(
  handler: RouteHandler,
  routeName: string,
): RouteHandler {
  return async (req: Request) => {
    const requestId = getRequestId(req);
    const method = req.method;
    // @review(L3-F5) new URL(req.url) is OUTSIDE the try/catch block. Malformed URL =
    //   unlogged crash. Mitigated by Next.js URL validation upstream, but defense-in-depth
    //   would put this inside the try block.
    //   [severity:info] [domain:api]
    const url = new URL(req.url);
    const path = url.pathname;
    const start = Date.now();
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    const referer = getReferer(req);

    log.info(`${method} ${path}`, {
      requestId,
      route: routeName,
      clientIp,
      userAgent: userAgent.slice(0, 200),
      referer: referer.slice(0, 200),
    });

    // Wrap handler in AsyncLocalStorage context so downstream code can
    // access requestId/clientIp/country/userAgent/path without explicit
    // parameter threading.
    const country = req.headers.get('x-vercel-ip-country') ?? undefined;
    const runHandler = () =>
      requestStore.run(
        {
          requestId,
          clientIp,
          country,
          userAgent: userAgent.slice(0, 200),
          path,
        },
        () => handler(req),
      );

    try {
      const response = await runHandler();
      const durationMs = Date.now() - start;
      const status = response.status;

      if (status >= 500) {
        log.error(`${method} ${path} ${status}`, {
          requestId,
          route: routeName,
          status,
          durationMs,
          clientIp,
        });
      } else if (status >= 400) {
        log.warn(`${method} ${path} ${status}`, {
          requestId,
          route: routeName,
          status,
          durationMs,
          clientIp,
        });
      } else {
        log.info(`${method} ${path} ${status}`, {
          requestId,
          route: routeName,
          status,
          durationMs,
        });
      }

      // Feed to anomaly detector (non-blocking)
      checkAnomaly({ clientIp, userAgent, route: routeName, status });

      return response;
    // @review(L3-F3) CRITICAL CHAIN: If checkAnomaly() throws (line after log.error),
    //   the original error is replaced. throw error is never reached.
    //   Combined with L3-F4 (log.error unprotected) and L3-F1 (JSON.stringify in emit),
    //   this creates a double-fault path with total information loss.
    //   Fix: wrap both log.error and checkAnomaly in individual try/catch.
    //   [severity:risk] [domain:api] [connects:L3-F4,L3-F1]
    } catch (error) {
      const durationMs = Date.now() - start;
      // @review(L3-F4) log.error() has no try/catch protection here. If the logger itself
      //   fails (e.g. circular reference in context triggers JSON.stringify error),
      //   the original route error is lost and the logger error propagates instead.
      //   [severity:concern] [domain:api] [connects:L3-F3,L3-F1]
      log.error(`${method} ${path} unhandled error`, toError(error), {
        requestId,
        route: routeName,
        durationMs,
        clientIp,
      });
      // @review(L3-F3B) checkAnomaly() called BEFORE throw error. If this throws,
      //   the re-throw is never reached and the anomaly error propagates instead
      //   of the original route error. The original error WAS logged (if L3-F4 passed),
      //   but the wrong exception reaches Next.js error handling.
      //   [severity:risk] [domain:api] [connects:L3-F3]
      checkAnomaly({ clientIp, userAgent, route: routeName, status: 500 });
      throw error;
    }
  };
}
