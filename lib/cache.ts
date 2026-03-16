// Distributed cache abstraction with graceful in-memory fallback.
//
// Uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// are set. Falls back to an in-memory Map when env vars are missing (local dev,
// tests) or when Redis is unreachable at runtime.
//
// Reads process.env directly to avoid circular dependency with lib/env.ts.
// The env.ts schema includes these vars for startup-time validation, but the
// cache module initializes lazily on first access.

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
let redisWarningLogged = false;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redis = new Redis({ url, token });
  }
  return redis;
}

// In-memory fallback for dev/test or Redis failure.
const localCache = new Map<string, { value: string; expiresAt: number }>();

function logRedisWarning(err: unknown) {
  if (!redisWarningLogged) {
    redisWarningLogged = true;
    console.warn('[cache] Redis unavailable, falling back to in-memory:', err);
  }
}

function localGet(key: string): string | null {
  const entry = localCache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    localCache.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Retrieve a cached value by key. Returns null on cache miss or error.
 *
 * Redis path: Upstash auto-deserializes JSON, so we use get<T> directly.
 * Local path: values are stored as JSON strings and parsed on retrieval.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (client) {
    try {
      // Upstash auto-deserializes JSON stored via set(). Using get<T>()
      // lets Upstash return the deserialized value directly, avoiding
      // double-parse bugs with string values.
      const result = await client.get<T>(key);
      return result ?? null;
    } catch (err) {
      logRedisWarning(err);
    }
  }
  const raw = localGet(key);
  if (raw === null) return null;
  return JSON.parse(raw) as T;
}

/**
 * Store a value in cache with a TTL in seconds.
 *
 * Redis path: Upstash handles serialization natively.
 * Local path: values are JSON-stringified for storage.
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const client = getRedis();
  if (client) {
    try {
      // Let Upstash handle serialization. Passing the value directly
      // avoids double-serialization (JSON.stringify then Upstash's
      // internal serialize) which causes parse failures for string values.
      await client.set(key, value, { ex: ttlSeconds });
      return;
    } catch (err) {
      logRedisWarning(err);
    }
  }
  localCache.set(key, {
    value: JSON.stringify(value),
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Delete a cached entry by key.
 */
export async function cacheDel(key: string): Promise<void> {
  const client = getRedis();
  if (client) {
    try {
      await client.del(key);
      return;
    } catch (err) {
      logRedisWarning(err);
    }
  }
  localCache.delete(key);
}

/**
 * Check whether a key exists in the cache and has not expired.
 */
export async function cacheExists(key: string): Promise<boolean> {
  const client = getRedis();
  if (client) {
    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (err) {
      logRedisWarning(err);
    }
  }
  const entry = localCache.get(key);
  if (!entry) return false;
  if (Date.now() >= entry.expiresAt) {
    localCache.delete(key);
    return false;
  }
  return true;
}

/**
 * Clear the in-memory fallback cache. Useful in tests.
 * Does not affect Redis.
 */
export function clearLocalCache(): void {
  localCache.clear();
}
