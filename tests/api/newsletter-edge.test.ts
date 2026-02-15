import { describe, expect, it, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Hoisted mocks                                                       */
/* ------------------------------------------------------------------ */

const { checkRateLimitMock, getClientIdentifierMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  getClientIdentifierMock: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIdentifier: getClientIdentifierMock,
}));

// Mock DB
const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
const mockValues = vi
  .fn()
  .mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

vi.mock('@/db', () => ({
  requireDb: () => ({ insert: mockInsert }),
}));

vi.mock('@/db/schema', () => ({
  newsletterSignups: Symbol('newsletterSignups'),
}));

/* ------------------------------------------------------------------ */

import { POST } from '@/app/api/newsletter/route';

describe('newsletter edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientIdentifierMock.mockReturnValue('127.0.0.1');
    checkRateLimitMock.mockReturnValue({
      success: true,
      remaining: 4,
      resetAt: Date.now() + 3_600_000,
    });
  });

  function makeReq(body: unknown) {
    return new Request('http://localhost/api/newsletter', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('H1: duplicate email → 200 { ok: true } (onConflictDoNothing)', async () => {
    // onConflictDoNothing resolves without error, simulating idempotent insert
    const res = await POST(makeReq({ email: 'dupe@example.com' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockOnConflictDoNothing).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({ email: 'dupe@example.com' });
  });

  it('U1: email > 256 characters → 400 "Invalid email address."', async () => {
    const longLocal = 'a'.repeat(250);
    const longEmail = `${longLocal}@example.com`; // > 256 chars total

    const res = await POST(makeReq({ email: longEmail }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid email address.' });
  });

  it('U2: rate limit → 429 "Rate limit exceeded."', async () => {
    checkRateLimitMock.mockReturnValue({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 3_600_000,
    });

    const res = await POST(makeReq({ email: 'test@example.com' }));

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: 'Rate limit exceeded.', code: 'RATE_LIMITED' });
  });

  it('U3: email with whitespace → 400 (regex rejects spaces)', async () => {
    const res = await POST(makeReq({ email: 'test @example.com' }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid email address.' });
  });
});
