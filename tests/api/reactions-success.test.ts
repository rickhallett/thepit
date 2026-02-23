import { describe, expect, it, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Hoisted mocks                                                       */
/* ------------------------------------------------------------------ */

const {
  checkRateLimitMock,
  getClientIdentifierMock,
  authMock,
  mockInsert,
  mockValues,
  mockOnConflict,
  mockSelect,
  mockSelectResult,
  mockDelete,
} = vi.hoisted(() => {
  const mockOnConflict = vi.fn().mockResolvedValue(undefined);
  const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflict });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

  // select().from().where().limit() chain — defaults to empty (no existing reaction)
  const mockSelectResult: { id: number }[] = [];
  const mockLimit = vi.fn().mockImplementation(() => Promise.resolve(mockSelectResult));
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

  // delete().where() chain
  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
  const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });

  return {
    checkRateLimitMock: vi.fn(),
    getClientIdentifierMock: vi.fn(),
    authMock: vi.fn(),
    mockInsert,
    mockValues,
    mockOnConflict,
    mockSelect,
    mockSelectResult,
    mockDelete,
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
  requireDb: () => ({
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  }),
}));

vi.mock('@/db/schema', () => ({
  reactions: { id: Symbol('reactions.id'), clientFingerprint: Symbol('reactions.clientFingerprint') },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => args),
  eq: vi.fn((a: unknown, b: unknown) => [a, b]),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    { raw: (s: string) => s },
  ),
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

    // Reset select chain for each test.
    // Call 1: existence check → empty (no existing reaction → insert path)
    // Call 2: absolute counts query → { heart: 1, fire: 0 }
    const existenceLimit = vi.fn().mockResolvedValue([]);
    const existenceWhere = vi.fn().mockReturnValue({ limit: existenceLimit });
    const existenceFrom = vi.fn().mockReturnValue({ where: existenceWhere });

    const countsWhere = vi.fn().mockResolvedValue([{ heart: 1, fire: 0 }]);
    const countsFrom = vi.fn().mockReturnValue({ where: countsWhere });

    mockSelect
      .mockReturnValueOnce({ from: existenceFrom })   // 1st call: existence check
      .mockReturnValueOnce({ from: countsFrom });      // 2nd call: absolute counts
  });

  function makeReq(body: unknown) {
    return new Request('http://localhost/api/reactions', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('H1: valid heart reaction with authenticated user → 200 { ok: true, action: added }', async () => {
    authMock.mockResolvedValue({ userId: 'user_abc' });

    const res = await POST(
      makeReq({ boutId: 'bout-test-abc12', turnIndex: 0, reactionType: 'heart' }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.action).toBe('added');
    expect(body.counts).toEqual({ heart: 1, fire: 0 });
    expect(body.turnIndex).toBe(0);

    // Verify insert was called with correct values including userId and fingerprint
    expect(mockValues).toHaveBeenCalledWith({
      boutId: 'bout-test-abc12',
      turnIndex: 0,
      reactionType: 'heart',
      userId: 'user_abc',
      clientFingerprint: 'user_abc',
    });
    expect(mockOnConflict).toHaveBeenCalled();
  });

  it('H2: valid fire reaction without authentication → 200 { ok: true, action: added }, userId=anon', async () => {
    authMock.mockResolvedValue({ userId: null });

    const res = await POST(
      makeReq({ boutId: 'bout-test-def34', turnIndex: 3, reactionType: 'fire' }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.action).toBe('added');
    expect(body.counts).toEqual({ heart: 1, fire: 0 });
    expect(body.turnIndex).toBe(3);

    // Anonymous users: userId is null (FK-safe), fingerprint used for dedup
    expect(mockValues).toHaveBeenCalledWith({
      boutId: 'bout-test-def34',
      turnIndex: 3,
      reactionType: 'fire',
      userId: null,
      clientFingerprint: 'anon:127.0.0.1',
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
