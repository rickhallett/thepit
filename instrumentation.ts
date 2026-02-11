// Next.js instrumentation hook.
//
// Loads Sentry server/edge configs on startup. This file is the
// official Next.js entry point for instrumentation — it runs once
// when the server starts, before any requests are handled.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = (...args: unknown[]) => {
  // Dynamic import to avoid bundling Sentry when DSN is not set
  import('@sentry/nextjs').then((Sentry) => {
    if (typeof Sentry.captureRequestError === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Sentry.captureRequestError as (...a: any[]) => void)(...args);
    }
  });
};
