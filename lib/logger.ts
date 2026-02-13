// Structured logging for The Pit.
//
// Zero external dependencies. Wraps console.* with structured JSON output
// in production and human-readable output in development. Every log line
// includes a timestamp, level, and optional context fields.
//
// Usage:
//   import { log } from '@/lib/logger';
//   log.info('Bout started', { boutId, presetId });
//   log.error('Stream failed', error, { boutId });

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

  const sanitizedCtx = sanitize(ctx) as LogContext;

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
};
