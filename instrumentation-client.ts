// Next.js client instrumentation hook (App Router).
//
// Captures client-side router transitions for Sentry performance monitoring.
// This file complements sentry.client.config.ts which handles init.

import * as Sentry from '@sentry/nextjs';

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
