import { describe, expect, it, beforeEach, vi } from 'vitest';
import { checkRateLimit, getClientIdentifier, type RateLimitConfig } from '@/lib/rate-limit';

describe('rate-limit', () => {
  const config: RateLimitConfig = {
    name: 'test-limiter',
    maxRequests: 3,
    windowMs: 1000,
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('allows requests within limit', () => {
    const result1 = checkRateLimit(config, 'client-1');
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = checkRateLimit(config, 'client-1');
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = checkRateLimit(config, 'client-1');
    expect(result3.success).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it('blocks requests over limit', () => {
    checkRateLimit(config, 'client-2');
    checkRateLimit(config, 'client-2');
    checkRateLimit(config, 'client-2');

    const result = checkRateLimit(config, 'client-2');
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after window expires', () => {
    checkRateLimit(config, 'client-3');
    checkRateLimit(config, 'client-3');
    checkRateLimit(config, 'client-3');

    // Should be blocked
    expect(checkRateLimit(config, 'client-3').success).toBe(false);

    // Advance time past window
    vi.advanceTimersByTime(1001);

    // Should be allowed again
    const result = checkRateLimit(config, 'client-3');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('tracks different clients separately', () => {
    checkRateLimit(config, 'client-a');
    checkRateLimit(config, 'client-a');
    checkRateLimit(config, 'client-a');

    // Client A is blocked
    expect(checkRateLimit(config, 'client-a').success).toBe(false);

    // Client B has full quota
    const result = checkRateLimit(config, 'client-b');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('tracks different rate limiters separately', () => {
    const configA: RateLimitConfig = { name: 'limiter-a', maxRequests: 1, windowMs: 1000 };
    const configB: RateLimitConfig = { name: 'limiter-b', maxRequests: 1, windowMs: 1000 };

    checkRateLimit(configA, 'client-x');
    expect(checkRateLimit(configA, 'client-x').success).toBe(false);

    // Different limiter should allow
    expect(checkRateLimit(configB, 'client-x').success).toBe(true);
  });

  it('provides reset timestamp', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const result = checkRateLimit(config, 'client-reset');
    expect(result.resetAt).toBe(now + config.windowMs);
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
