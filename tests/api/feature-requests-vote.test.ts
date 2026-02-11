import { describe, expect, it, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Hoisted mocks                                                       */
/* ------------------------------------------------------------------ */

const {
  authMock,
  checkRateLimitMock,
  mockSelectLimit,
  mockDeleteWhere,
  _mockOnConflictDoNothing,
  _mockInsertValues,
  mockInsert,
  mockCountResult,
} = vi.hoisted(() => {
  const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
  const mockInsertValues = vi
    .fn()
    .mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
  const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
  const mockSelectLimit = vi.fn();
  const mockCountResult = vi.fn();
  return {
    authMock: vi.fn(),
    checkRateLimitMock: vi.fn(),
    mockSelectLimit,
    mockDeleteWhere,
    _mockOnConflictDoNothing: mockOnConflictDoNothing,
    _mockInsertValues: mockInsertValues,
    mockInsert,
    mockCountResult,
  };
});

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('@/db', () => ({
  requireDb: () => ({
    insert: mockInsert,
    delete: () => ({ where: mockDeleteWhere }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mockSelectLimit,
        }),
      }),
    }),
  }),
}));

vi.mock('@/db/schema', () => ({
  featureRequestVotes: {
    id: Symbol('id'),
    featureRequestId: Symbol('featureRequestId'),
    userId: Symbol('userId'),
  },
}));

/* ------------------------------------------------------------------ */

import { POST } from '@/app/api/feature-requests/vote/route';

describe('feature-requests/vote api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: 'user_123' });
    checkRateLimitMock.mockReturnValue({
      success: true,
      remaining: 29,
      resetAt: Date.now() + 60_000,
    });
    // Default: no existing vote
    mockSelectLimit.mockResolvedValue([]);
    // Default count after vote
    mockCountResult.mockResolvedValue([{ count: 1 }]);
  });

  function makeReq(body: unknown) {
    return new Request('http://localhost/api/feature-requests/vote', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  function makeRawReq(body: string) {
    return new Request('http://localhost/api/feature-requests/vote', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('U1: invalid JSON returns 400', async () => {
    const res = await POST(makeRawReq('{bad'));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Invalid JSON.');
  });

  it('U2: missing featureRequestId returns 400', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Missing or invalid featureRequestId.');
  });

  it('U3: non-integer featureRequestId returns 400', async () => {
    const res = await POST(makeReq({ featureRequestId: 'abc' }));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Missing or invalid featureRequestId.');
  });

  it('U4: unauthenticated returns 401', async () => {
    authMock.mockResolvedValue({ userId: null });

    const res = await POST(makeReq({ featureRequestId: 1 }));
    expect(res.status).toBe(401);
    expect(await res.text()).toBe('Sign in required.');
  });

  it('U5: rate limited returns 429', async () => {
    checkRateLimitMock.mockReturnValue({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });

    const res = await POST(makeReq({ featureRequestId: 1 }));
    expect(res.status).toBe(429);
  });
});
