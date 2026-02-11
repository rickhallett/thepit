'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Root-level error boundary that catches errors in the root layout.
 * This is the last-resort catch for unhandled errors.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
          <p className="text-xs uppercase tracking-[0.4em] text-red-400">
            Something went wrong.
          </p>
          {error.digest && (
            <p className="font-mono text-[10px] text-foreground/30">
              {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="border-2 border-foreground/60 px-4 py-2 text-xs uppercase tracking-[0.3em] transition hover:border-accent hover:text-accent"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
