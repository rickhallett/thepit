// API route logging wrapper for observability.
//
// Wraps Next.js API route handlers with automatic request/response
// logging, timing, request ID propagation, and forensic context
// (client IP, user agent, referer).

import { toError } from '@/lib/errors';
import { log } from '@/lib/logger';
import { getRequestId, getClientIp, getUserAgent, getReferer } from '@/lib/request-context';
import { checkAnomaly } from '@/lib/anomaly';

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

    try {
      const response = await handler(req);
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
    } catch (error) {
      const durationMs = Date.now() - start;
      log.error(`${method} ${path} unhandled error`, toError(error), {
        requestId,
        route: routeName,
        durationMs,
        clientIp,
      });
      checkAnomaly({ clientIp, userAgent, route: routeName, status: 500 });
      throw error;
    }
  };
}
