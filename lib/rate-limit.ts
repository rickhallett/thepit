/**
 * Distributed rate limiter with in-memory fallback.
 *
 * When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, uses
 * @upstash/ratelimit for distributed sliding-window rate limiting across
 * all serverless instances. Falls back to per-instance in-memory rate
 * limiting when Redis is unavailable (local dev, tests, Redis failure).
 *
 * DB-level constraints (unique indexes, atomic conditional updates,
 * preauthorization) remain the authoritative enforcement layer. This
 * rate limiter provides best-effort throttling to reduce load on those
 * DB checks.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { resolveClientIp } from '@/lib/ip';

// ---------------------------------------------------------------------------
// Distributed (Upstash Redis) rate limiter
// ---------------------------------------------------------------------------

/**
 * One Ratelimit instance per unique (name, maxRequests, windowMs) tuple.
 * The cache key includes limit parameters because the same config name
 * (e.g. 'bout-creation') may be called with different maxRequests per
 * tier (anonymous: 2, free: 5, pass: 15). Caching by name alone would
 * lock in the first-seen limit for all subsequent tiers.
 */
const distributedLimiters = new Map<string, Ratelimit>();

/** Shared Redis instance for all limiters. Created once on first use. */
let sharedRedis: Redis | null = null;
let redisWarningLogged = false;

function getSharedRedis(): Redis | null {
  if (sharedRedis) return sharedRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  sharedRedis = new Redis({ url, token });
  return sharedRedis;
}

/**
 * Return an Upstash Ratelimit instance for the given config, or null when
 * Redis env vars are missing. Instances are created lazily and cached by
 * the full config signature (name + maxRequests + windowMs).
 */
function getDistributedLimiter(config: RateLimitConfig): Ratelimit | null {
  const redis = getSharedRedis();
  if (!redis) return null;

  const cacheKey = `${config.name}:${config.maxRequests}:${config.windowMs}`;
  const existing = distributedLimiters.get(cacheKey);
  if (existing) return existing;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs} ms`),
    prefix: `ratelimit:${config.name}:${config.maxRequests}`,
  });

  distributedLimiters.set(cacheKey, limiter);
  return limiter;
}

// ---------------------------------------------------------------------------
// In-memory fallback rate limiter
// ---------------------------------------------------------------------------

type RateLimitEntry = {
  count: number;
  windowStart: number;
};

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

const cleanup = (store: Map<string, RateLimitEntry>, windowMs: number) => {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    if (now - entry.windowStart > windowMs) {
      store.delete(key);
    }
  }
};

/** In-memory sliding window check (original implementation). */
function checkRateLimitInMemory(
  config: RateLimitConfig,
  identifier: string,
): RateLimitResult {
  const { name, maxRequests, windowMs } = config;

  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }

  cleanup(store, windowMs);

  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(identifier, { count: 1, windowStart: now });
    return {
      success: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  if (entry.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.windowStart + windowMs,
    };
  }

  entry.count += 1;
  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.windowStart + windowMs,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type RateLimitConfig = {
  /** Unique identifier for this rate limiter (e.g., 'reactions') */
  name: string;
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
};

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Check if a request should be rate limited.
 *
 * Uses distributed (Upstash Redis) rate limiting when Redis env vars are
 * set. Falls back to in-memory rate limiting otherwise, or when Redis
 * is unreachable at runtime.
 *
 * @param config - Rate limit configuration
 * @param identifier - Unique identifier for the client (IP, userId, etc.)
 * @returns Object with success boolean, remaining requests, and reset timestamp
 */
export async function checkRateLimit(
  config: RateLimitConfig,
  identifier: string,
): Promise<RateLimitResult> {
  const distributed = getDistributedLimiter(config);
  if (distributed) {
    try {
      const result = await distributed.limit(identifier);
      return {
        success: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    } catch (err) {
      if (!redisWarningLogged) {
        redisWarningLogged = true;
        console.warn('[rate-limit] Redis unavailable, falling back to in-memory:', err);
      }
    }
  }

  return checkRateLimitInMemory(config, identifier);
}

/**
 * Extract a client identifier from a request for rate limiting.
 *
 * Delegates to the canonical resolveClientIp() from lib/ip.ts to ensure
 * consistent IP resolution across middleware and rate limiting.
 */
export function getClientIdentifier(req: Request): string {
  return resolveClientIp(req.headers);
}
