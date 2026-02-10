import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock rate-limit to control rate limiting in tests
const { checkRateLimitMock, getClientIdentifierMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  getClientIdentifierMock: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIdentifier: getClientIdentifierMock,
}));

import { POST } from '@/app/api/reactions/route';

describe('reactions api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: allow all requests
    getClientIdentifierMock.mockReturnValue('127.0.0.1');
    checkRateLimitMock.mockReturnValue({
      success: true,
      remaining: 29,
      resetAt: Date.now() + 60000,
    });
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/reactions', {
      method: 'POST',
      body: '{bad',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing fields', async () => {
    const req = new Request('http://localhost/api/reactions', {
      method: 'POST',
      body: JSON.stringify({ boutId: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid reaction type', async () => {
    const req = new Request('http://localhost/api/reactions', {
      method: 'POST',
      body: JSON.stringify({
        boutId: 'bout-1',
        turnIndex: 1,
        reactionType: 'lol',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    const resetAt = Date.now() + 30000;
    checkRateLimitMock.mockReturnValue({
      success: false,
      remaining: 0,
      resetAt,
    });

    const req = new Request('http://localhost/api/reactions', {
      method: 'POST',
      body: JSON.stringify({
        boutId: 'bout-1',
        turnIndex: 0,
        reactionType: 'heart',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(429);
    expect(await res.text()).toBe('Too many requests.');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(res.headers.get('Retry-After')).toBeDefined();
  });
});
