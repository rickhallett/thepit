import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { checkRateLimit, getClientIdentifier, type RateLimitConfig } from '@/lib/rate-limit';

describe('rate-limit (in-memory fallback)', () => {
  const config: RateLimitConfig = {
    name: 'test-limiter',
    maxRequests: 3,
    windowMs: 1000,
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('allows requests within limit', async () => {
    const result1 = await checkRateLimit(config, 'client-1');
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = await checkRateLimit(config, 'client-1');
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = await checkRateLimit(config, 'client-1');
    expect(result3.success).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it('blocks requests over limit', async () => {
    await checkRateLimit(config, 'client-2');
    await checkRateLimit(config, 'client-2');
    await checkRateLimit(config, 'client-2');

    const result = await checkRateLimit(config, 'client-2');
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after window expires', async () => {
    await checkRateLimit(config, 'client-3');
    await checkRateLimit(config, 'client-3');
    await checkRateLimit(config, 'client-3');

    // Should be blocked
    expect((await checkRateLimit(config, 'client-3')).success).toBe(false);

    // Advance time past window
    vi.advanceTimersByTime(1001);

    // Should be allowed again
    const result = await checkRateLimit(config, 'client-3');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('tracks different clients separately', async () => {
    await checkRateLimit(config, 'client-a');
    await checkRateLimit(config, 'client-a');
    await checkRateLimit(config, 'client-a');

    // Client A is blocked
    expect((await checkRateLimit(config, 'client-a')).success).toBe(false);

    // Client B has full quota
    const result = await checkRateLimit(config, 'client-b');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('tracks different rate limiters separately', async () => {
    const configA: RateLimitConfig = { name: 'limiter-a', maxRequests: 1, windowMs: 1000 };
    const configB: RateLimitConfig = { name: 'limiter-b', maxRequests: 1, windowMs: 1000 };

    await checkRateLimit(configA, 'client-x');
    expect((await checkRateLimit(configA, 'client-x')).success).toBe(false);

    // Different limiter should allow
    expect((await checkRateLimit(configB, 'client-x')).success).toBe(true);
  });

  it('provides reset timestamp', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const result = await checkRateLimit(config, 'client-reset');
    expect(result.resetAt).toBe(now + config.windowMs);
  });
});

describe('rate-limit (distributed)', () => {
  const config: RateLimitConfig = {
    name: 'dist-test',
    maxRequests: 5,
    windowMs: 60_000,
  };

  const mockLimit = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    mockLimit.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses distributed limiter when Redis env vars are set', async () => {
    mockLimit.mockResolvedValue({
      success: true,
      remaining: 4,
      reset: Date.now() + 60_000,
      limit: 5,
    });

    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token');

    vi.doMock('@upstash/ratelimit', () => ({
      Ratelimit: class MockRatelimit {
        limit = mockLimit;
        static slidingWindow() {
          return { type: 'slidingWindow' };
        }
      },
    }));
    vi.doMock('@upstash/redis', () => ({
      Redis: class MockRedis {
        constructor() {}
      },
    }));

    const mod = await import('@/lib/rate-limit');
    const result = await mod.checkRateLimit(config, 'user-1');

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(mockLimit).toHaveBeenCalledWith('user-1');
  });

  it('falls back to in-memory when distributed limiter throws', async () => {
    mockLimit.mockRejectedValue(new Error('Redis connection failed'));

    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token');

    vi.doMock('@upstash/ratelimit', () => ({
      Ratelimit: class MockRatelimit {
        limit = mockLimit;
        static slidingWindow() {
          return { type: 'slidingWindow' };
        }
      },
    }));
    vi.doMock('@upstash/redis', () => ({
      Redis: class MockRedis {
        constructor() {}
      },
    }));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mod = await import('@/lib/rate-limit');
    const result = await mod.checkRateLimit(config, 'user-fallback');

    // Should succeed via in-memory fallback
    expect(result.success).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[rate-limit] Redis unavailable'),
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it('maps distributed result fields correctly', async () => {
    const resetTime = Date.now() + 30_000;
    mockLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: resetTime,
      limit: 5,
    });

    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token');

    vi.doMock('@upstash/ratelimit', () => ({
      Ratelimit: class MockRatelimit {
        limit = mockLimit;
        static slidingWindow() {
          return { type: 'slidingWindow' };
        }
      },
    }));
    vi.doMock('@upstash/redis', () => ({
      Redis: class MockRedis {
        constructor() {}
      },
    }));

    const mod = await import('@/lib/rate-limit');
    const result = await mod.checkRateLimit(config, 'user-blocked');

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetAt).toBe(resetTime);
  });
});

describe('getClientIdentifier', () => {
  it('uses rightmost IP from x-forwarded-for (proxy-appended, not attacker-controlled)', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
    });
    expect(getClientIdentifier(req)).toBe('10.0.0.1');
  });

  it('uses single IP from x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    expect(getClientIdentifier(req)).toBe('1.2.3.4');
  });

  it('extracts IP from x-real-ip header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '172.16.0.1' },
    });
    expect(getClientIdentifier(req)).toBe('172.16.0.1');
  });

  it('returns unknown when no IP headers present', () => {
    const req = new Request('http://localhost');
    expect(getClientIdentifier(req)).toBe('unknown');
  });

  it('prefers x-vercel-forwarded-for over x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-vercel-forwarded-for': '9.8.7.6',
        'x-forwarded-for': '1.2.3.4, 5.6.7.8',
        'x-real-ip': '10.11.12.13',
      },
    });
    expect(getClientIdentifier(req)).toBe('9.8.7.6');
  });

  it('prefers x-forwarded-for over x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '1.2.3.4',
        'x-real-ip': '5.6.7.8',
      },
    });
    expect(getClientIdentifier(req)).toBe('1.2.3.4');
  });
});
