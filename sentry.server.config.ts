// Sentry server-side configuration.
//
// Initializes Sentry on the server for error capture and performance
// monitoring. Only active when SENTRY_DSN is set.

import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,

    tracesSampleRate: 0.1,

    // Capture all server errors.
    sampleRate: 1.0,

    // Structured logs for bout lifecycle and operational events.
    enableLogs: true,

    // Attach request data to error events.
    sendDefaultPii: false,
  });
}
