import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// No Redis env vars in test - all operations use in-memory fallback.

describe('lib/cache (in-memory fallback)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const loadCache = async () => import('@/lib/cache');

  it('cacheGet returns null for missing key', async () => {
    const { cacheGet, clearLocalCache } = await loadCache();
    clearLocalCache();
    const result = await cacheGet('nonexistent');
    expect(result).toBeNull();
  });

  it('cacheSet + cacheGet round-trips a value', async () => {
    const { cacheGet, cacheSet, clearLocalCache } = await loadCache();
    clearLocalCache();
    await cacheSet('hello', 'world', 60);
    const result = await cacheGet<string>('hello');
    expect(result).toBe('world');
  });

  it('cacheSet + cacheGet round-trips an object with JSON serialization', async () => {
    const { cacheGet, cacheSet, clearLocalCache } = await loadCache();
    clearLocalCache();
    const obj = { name: 'Darwin', wins: 42, nested: { score: 0.95 } };
    await cacheSet('agent:1', obj, 300);
    const result = await cacheGet<typeof obj>('agent:1');
    expect(result).toEqual(obj);
  });

  it('TTL expiry returns null after elapsed time', async () => {
    const { cacheGet, cacheSet, clearLocalCache } = await loadCache();
    clearLocalCache();
    await cacheSet('ephemeral', 'data', 10);

    // Still valid at 9 seconds
    vi.advanceTimersByTime(9_000);
    expect(await cacheGet('ephemeral')).toBe('data');

    // Expired at 10 seconds
    vi.advanceTimersByTime(1_000);
    expect(await cacheGet('ephemeral')).toBeNull();
  });

  it('cacheDel removes an entry', async () => {
    const { cacheGet, cacheSet, cacheDel, clearLocalCache } = await loadCache();
    clearLocalCache();
    await cacheSet('to-delete', 'value', 60);
    expect(await cacheGet('to-delete')).toBe('value');
    await cacheDel('to-delete');
    expect(await cacheGet('to-delete')).toBeNull();
  });

  it('cacheExists returns true for existing key and false for missing', async () => {
    const { cacheSet, cacheExists, clearLocalCache } = await loadCache();
    clearLocalCache();
    expect(await cacheExists('nope')).toBe(false);
    await cacheSet('yep', 1, 60);
    expect(await cacheExists('yep')).toBe(true);
  });

  it('cacheExists returns false after TTL expiry', async () => {
    const { cacheSet, cacheExists, clearLocalCache } = await loadCache();
    clearLocalCache();
    await cacheSet('expiring', true, 5);
    expect(await cacheExists('expiring')).toBe(true);
    vi.advanceTimersByTime(5_000);
    expect(await cacheExists('expiring')).toBe(false);
  });

  it('clearLocalCache clears all entries', async () => {
    const { cacheGet, cacheSet, clearLocalCache } = await loadCache();
    clearLocalCache();
    await cacheSet('a', 1, 60);
    await cacheSet('b', 2, 60);
    clearLocalCache();
    expect(await cacheGet('a')).toBeNull();
    expect(await cacheGet('b')).toBeNull();
  });

  it('handles number values', async () => {
    const { cacheGet, cacheSet, clearLocalCache } = await loadCache();
    clearLocalCache();
    await cacheSet('count', 42, 60);
    expect(await cacheGet<number>('count')).toBe(42);
  });

  it('handles null-ish stored values correctly', async () => {
    const { cacheGet, cacheSet, clearLocalCache } = await loadCache();
    clearLocalCache();
    // Storing 0 should be retrievable (not confused with cache miss)
    await cacheSet('zero', 0, 60);
    const result = await cacheGet<number>('zero');
    expect(result).toBe(0);
  });
});
