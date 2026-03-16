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
 * Deserializes JSON automatically.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (client) {
    try {
      const raw = await client.get<string>(key);
      if (raw === null || raw === undefined) return null;
      // Upstash auto-deserializes JSON, so raw may already be an object
      if (typeof raw === 'string') {
        return JSON.parse(raw) as T;
      }
      return raw as T;
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
 * Serializes to JSON automatically.
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const json = JSON.stringify(value);
  const client = getRedis();
  if (client) {
    try {
      await client.set(key, json, { ex: ttlSeconds });
      return;
    } catch (err) {
      logRedisWarning(err);
    }
  }
  localCache.set(key, {
    value: json,
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
