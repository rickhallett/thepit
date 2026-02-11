// Sentry client-side configuration.
//
// Initializes Sentry in the browser for error capture, session replay,
// and performance monitoring. Only active when SENTRY_DSN is set.

import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Capture 10% of transactions for performance monitoring.
    // Adjust upward once traffic patterns are understood.
    tracesSampleRate: 0.1,

    // Capture errors at 100% — every client error matters at launch.
    sampleRate: 1.0,

    // Session Replay: 1% of sessions, 100% of error sessions.
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration(),
    ],

    // Filter noisy browser errors
    ignoreErrors: [
      // Network errors from ad blockers, browser extensions
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      // Chrome extensions
      'chrome-extension://',
    ],
  });
}
