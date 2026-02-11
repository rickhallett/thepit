/**
 * Simple in-memory rate limiter for serverless environments.
 * Uses a sliding window approach with automatic cleanup.
 *
 * LIMITATION: In-memory only — each serverless instance has independent
 * state. A determined attacker hitting different instances can bypass
 * limits. For strict production enforcement, migrate to a shared store
 * (e.g. Upstash Redis).
 *
 * Current mitigations: DB-level constraints (unique indexes, atomic
 * conditional updates, preauthorization) serve as the authoritative
 * enforcement layer. This rate limiter provides best-effort throttling
 * to reduce load on those DB checks.
 */

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
 * @param config - Rate limit configuration
 * @param identifier - Unique identifier for the client (IP, userId, etc.)
 * @returns Object with success boolean, remaining requests, and reset timestamp
 */
export function checkRateLimit(
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
    // New window
    store.set(identifier, { count: 1, windowStart: now });
    return {
      success: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  if (entry.count >= maxRequests) {
    // Rate limited
    return {
      success: false,
      remaining: 0,
      resetAt: entry.windowStart + windowMs,
    };
  }

  // Increment and allow
  entry.count += 1;
  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.windowStart + windowMs,
  };
}

/**
 * Extract a client identifier from a request for rate limiting.
 * Uses IP address with fallback to a generic key.
 */
export function getClientIdentifier(req: Request): string {
  // Try various headers for IP address
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback - this shouldn't happen in production
  return 'unknown';
}
