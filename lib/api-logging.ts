// API route logging wrapper for observability.
//
// Wraps Next.js API route handlers with automatic request/response
// logging, timing, and request ID propagation.

import { log } from '@/lib/logger';
import { getRequestId } from '@/lib/request-context';

type RouteHandler = (req: Request) => Promise<Response> | Response;

/**
 * Wrap an API route handler with structured request/response logging.
 *
 * Logs:
 *   - START: method, path, requestId, userId (if available)
 *   - END:   status, durationMs, requestId
 *   - ERROR: status, error message, requestId (for 5xx responses)
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

    log.info(`${method} ${path}`, { requestId, route: routeName });

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
        });
      } else if (status >= 400) {
        log.warn(`${method} ${path} ${status}`, {
          requestId,
          route: routeName,
          status,
          durationMs,
        });
      } else {
        log.info(`${method} ${path} ${status}`, {
          requestId,
          route: routeName,
          status,
          durationMs,
        });
      }

      return response;
    } catch (error) {
      const durationMs = Date.now() - start;
      log.error(`${method} ${path} unhandled error`, error as Error, {
        requestId,
        route: routeName,
        durationMs,
      });
      throw error;
    }
  };
}
