// Structured logging for The Pit.
//
// Zero external dependencies (except optional Sentry trace linking).
// Wraps console.* with structured JSON output in production and
// human-readable output in development. Every log line includes a
// timestamp, level, and optional context fields.
//
// Semantic log methods:
//   log.audit()    — credit settlements, tier changes, admin actions
//   log.metric()   — token counts, latency, cost tracking
//   log.security() — rate limit violations, auth failures, anomalies
//
// Usage:
//   import { log } from '@/lib/logger';
//   log.info('Bout started', { boutId, presetId });
//   log.error('Stream failed', error, { boutId });
//   log.audit('credit_settlement', { userId, delta });
//   log.metric('turn_latency', { boutId, durationMs });
//   log.security('rate_limit_exceeded', { clientIp, route });

import { getContext } from '@/lib/async-context';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

/** Signal categories for structured log filtering. */
export type LogSignal = 'audit' | 'metric' | 'security' | 'experiment';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type ConfigLevel = LogLevel | 'silent';

type LogContext = Record<string, unknown>;

/** Numeric priority for level comparison. Higher = more severe. */
const LEVEL_PRIORITY: Record<ConfigLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

/**
 * Minimum log level. Set via LOG_LEVEL env var.
 * Accepts: debug | info | warn | error | silent
 * Default: 'info'
 */
const MIN_LEVEL: ConfigLevel = (() => {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in LEVEL_PRIORITY) return env as ConfigLevel;
  return 'info';
})();

/** Strip API key patterns from any string value to prevent secret leakage. */
function sanitize(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/sk-ant-[A-Za-z0-9_-]+/g, '[REDACTED]')
      .replace(/sk-or-v1-[A-Za-z0-9_-]+/g, '[REDACTED]')
      .replace(/sk_(live|test)_[A-Za-z0-9]+/g, '[REDACTED]');
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitize(value.message),
      stack: value.stack ? sanitize(value.stack) : undefined,
    };
  }
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      sanitized[k] = sanitize(v);
    }
    return sanitized;
  }
  return value;
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const otelLogger = logs.getLogger('tspit');

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getSampleRate(path: string | undefined, level: LogLevel): number {
  if (level === 'error' || level === 'warn') return 1;
  if (!path) return 1;
  if (path === '/api/health') return 0;
  if (path === '/api/pv') return 0.1;
  return 1;
}

function shouldSample(path: string | undefined, level: LogLevel, requestId: string | undefined): boolean {
  const rate = getSampleRate(path, level);
  if (rate >= 1) return true;
  if (rate <= 0) return false;
  const key = requestId || `${path ?? 'unknown'}:${Date.now()}`;
  return (hashString(key) % 10_000) / 10_000 < rate;
}

function toSeverity(level: LogLevel): SeverityNumber {
  if (level === 'debug') return SeverityNumber.DEBUG;
  if (level === 'info') return SeverityNumber.INFO;
  if (level === 'warn') return SeverityNumber.WARN;
  return SeverityNumber.ERROR;
}

function emitOtel(level: LogLevel, msg: string, ctx: LogContext, error?: Error) {
  if (typeof process === 'undefined') return;
  try {
    const attributes: Record<string, unknown> = { ...ctx };
    if (error) {
      attributes.error_name = error.name;
      attributes.error_message = error.message;
    }
    otelLogger.emit({
      severityNumber: toSeverity(level),
      severityText: level.toUpperCase(),
      body: msg,
      attributes: attributes as any,
    });
  } catch {
    // OTel is best-effort; stdout logging remains the source of truth.
  }
}

/**
 * Attempt to read the active Sentry trace ID.
 * Returns undefined when Sentry is not loaded or no span is active.
 * Extracted as a named function for testability (vi.mock can intercept it).
 */
let _sentry: { getActiveSpan?: () => { spanContext: () => { traceId: string } } | undefined } | null = null;
let _sentryLoaded = false;

export function getSentryTraceId(): string | undefined {
  if (!_sentryLoaded) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _sentry = require('@sentry/nextjs');
    } catch {
      _sentry = null;
    }
    _sentryLoaded = true;
  }
  return _sentry?.getActiveSpan?.()?.spanContext?.()?.traceId;
}

function formatDev(level: LogLevel, msg: string, ctx?: LogContext): string {
  const levelTag = `[${level.toUpperCase()}]`.padEnd(7);
  const ctxStr = ctx && Object.keys(ctx).length
    ? ' ' + Object.entries(ctx).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ')
    : '';
  return `${levelTag} ${msg}${ctxStr}`;
}

function emit(
  level: LogLevel,
  msg: string,
  errorOrCtx?: Error | LogContext,
  maybeCtx?: LogContext,
) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[MIN_LEVEL]) return;

  let error: Error | undefined;
  let ctx: LogContext = {};

  if (errorOrCtx instanceof Error) {
    error = errorOrCtx;
    ctx = maybeCtx ?? {};
  } else if (errorOrCtx) {
    ctx = errorOrCtx;
  }

  // Auto-inject request context from AsyncLocalStorage if not explicitly provided.
  // This means callers no longer need to manually pass { requestId } on every
  // log call — it's automatically available from the request context.
  const reqCtx = getContext();
  if (reqCtx) {
    if (reqCtx.requestId && !ctx.requestId) ctx.requestId = reqCtx.requestId;
    if (reqCtx.clientIp && !ctx.clientIp) ctx.clientIp = reqCtx.clientIp;
    if (reqCtx.userId && !ctx.userId) ctx.userId = reqCtx.userId;
    if (reqCtx.country && !ctx.country) ctx.country = reqCtx.country;
    if (reqCtx.path && !ctx.path) ctx.path = reqCtx.path;
    if (reqCtx.copyVariant && !ctx.copyVariant) ctx.copyVariant = reqCtx.copyVariant;
    if (reqCtx.sessionId && !ctx.sessionId) ctx.sessionId = reqCtx.sessionId;
  }

  // Inject Sentry trace ID when available — links structured logs to
  // Sentry traces for cross-referencing in dashboards.
  if (!ctx.traceId) {
    const traceId = getSentryTraceId();
    if (traceId) ctx.traceId = traceId;
  }

  const sampleRate = getSampleRate(
    typeof ctx.path === 'string' ? ctx.path : undefined,
    level,
  );
  const sampled = shouldSample(
    typeof ctx.path === 'string' ? ctx.path : undefined,
    level,
    typeof ctx.requestId === 'string' ? ctx.requestId : undefined,
  );
  const sampledCtx = {
    ...ctx,
    sampled,
    sample_rate: sampleRate,
  };
  if (!sampled) return;

  const sanitizedCtx = sanitize(sampledCtx) as LogContext;
  emitOtel(level, msg, sanitizedCtx, error);

  if (IS_PRODUCTION) {
    const entry: Record<string, unknown> = {
      level,
      msg,
      ts: new Date().toISOString(),
      service: 'tspit',
      ...sanitizedCtx,
    };
    if (error) {
      entry.error = sanitize(error);
    }
    const line = JSON.stringify(entry);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  } else {
    const devMsg = formatDev(level, msg, sanitizedCtx);
    if (level === 'error') {
      console.error(devMsg);
      if (error) console.error(error);
    } else if (level === 'warn') {
      console.warn(devMsg);
      if (error) console.warn(error);
    } else if (level === 'debug') {
      console.debug(devMsg);
    } else {
      console.log(devMsg);
    }
  }
}

export const log = {
  debug(msg: string, ctx?: LogContext) {
    emit('debug', msg, ctx);
  },
  info(msg: string, ctx?: LogContext) {
    emit('info', msg, ctx);
  },
  warn(msg: string, errorOrCtx?: Error | LogContext, ctx?: LogContext) {
    emit('warn', msg, errorOrCtx, ctx);
  },
  error(msg: string, errorOrCtx?: Error | LogContext, ctx?: LogContext) {
    emit('error', msg, errorOrCtx, ctx);
  },

  // ─── Semantic log methods ───────────────────────────────────────────
  // Each adds a `signal` field for structured filtering in log aggregators.
  // Level mapping: audit→info, metric→info, security→warn.

  /** Audit events: credit settlements, tier changes, admin actions. */
  audit(msg: string, ctx?: LogContext) {
    emit('info', msg, { ...ctx, signal: 'audit' as const });
  },
  /** Metric events: token counts, latency, cost tracking. */
  metric(msg: string, ctx?: LogContext) {
    emit('info', msg, { ...ctx, signal: 'metric' as const });
  },
  /** Security events: rate limit violations, auth failures, anomalies. */
  security(msg: string, ctx?: LogContext) {
    emit('warn', msg, { ...ctx, signal: 'security' as const });
  },
  /** Experiment events: copy variant assignment, A/B test data. */
  experiment(msg: string, ctx?: LogContext) {
    emit('info', msg, { ...ctx, signal: 'experiment' as const });
  },
};
