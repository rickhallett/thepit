// Sentry edge runtime configuration.
//
// Initializes Sentry for edge middleware and edge routes.
// Only active when SENTRY_DSN is set.

import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    // TEMPORARY: Phase 7 — revert to 0.1 after load testing.
    tracesSampleRate: 1.0,
    sampleRate: 1.0,

    // Structured logs for operational events.
    enableLogs: true,
  });
}
