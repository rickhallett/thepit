// Next.js instrumentation hook.
//
// Loads Sentry server/edge configs on startup. This file is the
// official Next.js entry point for instrumentation — it runs once
// when the server starts, before any requests are handled.

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
