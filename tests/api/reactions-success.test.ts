import { describe, expect, it, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Hoisted mocks                                                       */
/* ------------------------------------------------------------------ */

const { checkRateLimitMock, getClientIdentifierMock, authMock, mockInsert, mockValues, mockOnConflict } =
  vi.hoisted(() => {
    const mockOnConflict = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflict });
    const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
    return {
      checkRateLimitMock: vi.fn(),
      getClientIdentifierMock: vi.fn(),
      authMock: vi.fn(),
      mockInsert,
      mockValues,
      mockOnConflict,
    };
  });

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIdentifier: getClientIdentifierMock,
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/db', () => ({
  requireDb: () => ({ insert: mockInsert }),
}));

vi.mock('@/db/schema', () => ({
  reactions: Symbol('reactions'),
}));

/* ------------------------------------------------------------------ */

import { POST } from '@/app/api/reactions/route';

describe('reactions success paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientIdentifierMock.mockReturnValue('127.0.0.1');
    checkRateLimitMock.mockReturnValue({
      success: true,
      remaining: 29,
      resetAt: Date.now() + 60_000,
    });
    authMock.mockResolvedValue({ userId: null });
  });

  function makeReq(body: unknown) {
    return new Request('http://localhost/api/reactions', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('H1: valid heart reaction with authenticated user → 200 { ok: true }', async () => {
    authMock.mockResolvedValue({ userId: 'user_abc' });

    const res = await POST(
      makeReq({ boutId: 'bout-test-abc12', turnIndex: 0, reactionType: 'heart' }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    // Verify insert was called with correct values including userId
    expect(mockValues).toHaveBeenCalledWith({
      boutId: 'bout-test-abc12',
      turnIndex: 0,
      reactionType: 'heart',
      userId: 'user_abc',
    });
    expect(mockOnConflict).toHaveBeenCalled();
  });

  it('H2: valid fire reaction without authentication → 200 { ok: true }, userId=null', async () => {
    authMock.mockResolvedValue({ userId: null });

    const res = await POST(
      makeReq({ boutId: 'bout-test-def34', turnIndex: 3, reactionType: 'fire' }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    // Anonymous users get an IP-based deduplication ID
    expect(mockValues).toHaveBeenCalledWith({
      boutId: 'bout-test-def34',
      turnIndex: 3,
      reactionType: 'fire',
      userId: 'anon:127.0.0.1',
    });
  });

  it('H3: response includes X-RateLimit-Remaining and X-RateLimit-Reset headers', async () => {
    const resetAt = Date.now() + 60_000;
    checkRateLimitMock.mockReturnValue({
      success: true,
      remaining: 25,
      resetAt,
    });

    const res = await POST(
      makeReq({ boutId: 'bout-test-ghi56', turnIndex: 1, reactionType: 'heart' }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('25');
    // X-RateLimit-Reset absolute timestamp removed to prevent info leakage
    expect(res.headers.has('X-RateLimit-Reset')).toBe(false);
  });

  it('U1: turnIndex as string instead of number → 400', async () => {
    const res = await POST(
      makeReq({ boutId: 'bout-test-jkl78', turnIndex: '0', reactionType: 'heart' }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing boutId or turnIndex.' });
  });
});
