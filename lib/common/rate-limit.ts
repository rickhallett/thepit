// In-memory sliding window rate limiter.
// No external dependencies. One instance per rate limit config.
//
// Note: stale keys are pruned lazily (on next check). One-shot keys persist
// until the process restarts. Acceptable for bounded user populations behind
// auth; add periodic eviction if used with high-cardinality anonymous traffic.
//
// Uses Date.now() — assumes monotonic wall clock. NTP rollbacks could skew
// resetAt calculations. Acceptable for serverless/edge environments.

export interface RateLimitConfig {
  /** Window size in milliseconds (e.g., 3600000 for 1 hour). */
  windowMs: number;
  /** Maximum requests allowed within the window. */
  maxRequests: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed. */
  ok: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** When the oldest request in the window expires. */
  resetAt: Date;
}

/**
 * Creates a sliding window rate limiter.
 * Timestamps are stored per key. Expired entries are pruned on each check.
 */
export function createRateLimiter(config: RateLimitConfig) {
  if (
    !Number.isFinite(config.windowMs) ||
    config.windowMs <= 0 ||
    !Number.isFinite(config.maxRequests) ||
    config.maxRequests <= 0 ||
    !Number.isInteger(config.maxRequests)
  ) {
    throw new Error(
      `Invalid rate limit config: windowMs=${config.windowMs}, maxRequests=${config.maxRequests}. ` +
        "Both must be positive finite numbers and maxRequests must be an integer.",
    );
  }

  const store = new Map<string, number[]>();

  function prune(key: string, now: number): number[] {
    const timestamps = store.get(key);
    if (!timestamps) return [];
    const cutoff = now - config.windowMs;
    const active = timestamps.filter((t) => t > cutoff);
    if (active.length === 0) {
      store.delete(key);
      return [];
    }
    store.set(key, active);
    return active;
  }

  function check(key: string): RateLimitResult {
    const now = Date.now();
    const active = prune(key, now);
    const remaining = Math.max(0, config.maxRequests - active.length);
    const resetAt = new Date(
      active.length > 0 ? active[0] + config.windowMs : now + config.windowMs,
    );

    if (active.length >= config.maxRequests) {
      return { ok: false, remaining: 0, resetAt };
    }

    active.push(now);
    store.set(key, active);
    return { ok: true, remaining: remaining - 1, resetAt };
  }

  function reset(key: string): void {
    store.delete(key);
  }

  return { check, reset };
}
