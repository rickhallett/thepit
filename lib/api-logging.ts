// API route logging wrapper for observability.
//
// Wraps Next.js API route handlers with automatic request/response
// logging, timing, request ID propagation, and forensic context
// (client IP, user agent, referer).

import { toError } from '@/lib/errors';
import { log } from '@/lib/logger';
import {
  getRequestId,
  getClientIp,
  getUserAgent,
  getReferer,
  getCopyVariant,
  getPosthogSessionId,
} from '@/lib/request-context';
import { checkAnomaly } from '@/lib/anomaly';
import { requestStore } from '@/lib/async-context';
import { forceFlushLogs } from '@/instrumentation';
import { after } from 'next/server';
import { nanoid } from 'nanoid';
import { auth } from '@clerk/nextjs/server';

type RouteHandler = (req: Request) => Promise<Response> | Response;

function scheduleFlush() {
  try {
    after(() => forceFlushLogs());
  } catch {
    void forceFlushLogs();
  }
}

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
    const copyVariant = getCopyVariant(req);
    const sessionId = getPosthogSessionId(req);
    const userId = req.headers.get('x-clerk-user-id') ?? undefined;

    // Wrap handler in AsyncLocalStorage context so downstream code can
    // access requestId/clientIp/country/userAgent/path without explicit
    // parameter threading.
    const country = req.headers.get('x-vercel-ip-country') ?? undefined;
    const runHandler = () =>
      requestStore.run(
        {
          requestId,
          clientIp,
          userId,
          sessionId,
          country,
          userAgent: userAgent.slice(0, 200),
          path,
          copyVariant,
        },
        () => handler(req),
      );

    try {
      const response = await runHandler();
      const durationMs = Date.now() - start;
      const status = response.status;

      const completionCtx = {
        event: 'request.completed',
        requestId,
        route: routeName,
        method,
        path,
        status,
        durationMs,
        clientIp,
        userId,
        copyVariant,
        sessionId,
      };

      if (status >= 500) log.error('request.completed', completionCtx);
      else if (status >= 400) log.warn('request.completed', completionCtx);
      else log.info('request.completed', completionCtx);

      // Feed to anomaly detector (non-blocking)
      checkAnomaly({ clientIp, userAgent, route: routeName, status });
      scheduleFlush();

      return response;
    } catch (error) {
      const durationMs = Date.now() - start;
      log.error('request.failed', toError(error), {
        event: 'request.failed',
        requestId,
        route: routeName,
        method,
        path,
        durationMs,
        clientIp,
        userId,
        copyVariant,
        sessionId,
      });
      checkAnomaly({ clientIp, userAgent, route: routeName, status: 500 });
      scheduleFlush();
      throw error;
    }
  };
}

type ActionHandler<T> = () => Promise<T>;

export async function withActionLogging<T>(
  actionName: string,
  handler: ActionHandler<T>,
): Promise<T> {
  const requestId = `action_${nanoid(10)}`;
  const start = Date.now();
  const userId = (await auth()).userId ?? undefined;
  const copyVariant = undefined;

  try {
    const result = await requestStore.run(
      {
        requestId,
        clientIp: 'server-action',
        userId,
        path: `action:${actionName}`,
        copyVariant,
      },
      handler,
    );
    log.info('action.completed', {
      event: 'action.completed',
      action: actionName,
      requestId,
      userId,
      durationMs: Date.now() - start,
      status: 'success',
    });
    scheduleFlush();
    return result;
  } catch (error) {
    log.error('action.failed', toError(error), {
      event: 'action.failed',
      action: actionName,
      requestId,
      userId,
      durationMs: Date.now() - start,
      status: 'failed',
    });
    scheduleFlush();
    throw error;
  }
}
