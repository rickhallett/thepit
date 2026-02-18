import * as Sentry from '@sentry/nextjs';
import { logs } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';

function resolvePostHogLogEndpoint(): string {
  const explicitHost = process.env.POSTHOG_PRIVATE_API?.trim();
  const publicHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  const host =
    explicitHost ||
    (publicHost && publicHost.startsWith('http') ? publicHost : '') ||
    'https://us.i.posthog.com';
  return `${host.replace(/\/$/, '')}/i/v1/logs`;
}

const posthogKey = process.env.POSTHOG_API_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
const processors = posthogKey
  ? [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: resolvePostHogLogEndpoint(),
          headers: {
            Authorization: `Bearer ${posthogKey}`,
            'Content-Type': 'application/json',
          },
        }),
      ),
    ]
  : [];

export const loggerProvider = new LoggerProvider({
  resource: resourceFromAttributes({
    'service.name': 'tspit',
    'service.version': process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    'deployment.environment': process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
  }),
  processors,
});

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    logs.setGlobalLoggerProvider(loggerProvider);
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;

export async function forceFlushLogs(): Promise<void> {
  try {
    await loggerProvider.forceFlush();
  } catch {
    // Log flushing is best-effort and must never break request handling.
  }
}
