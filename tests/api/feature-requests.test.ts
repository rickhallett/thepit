import { describe, expect, it, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Hoisted mocks                                                       */
/* ------------------------------------------------------------------ */

const {
  authMock,
  checkRateLimitMock,
  ensureUserRecordMock,
  mockReturning,
  mockValues,
  mockInsert,
} = vi.hoisted(() => {
  const mockReturning = vi.fn().mockResolvedValue([{ id: 42 }]);
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
  return {
    authMock: vi.fn(),
    checkRateLimitMock: vi.fn(),
    ensureUserRecordMock: vi.fn(),
    mockReturning,
    mockValues,
    mockInsert,
  };
});

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIdentifier: vi.fn().mockReturnValue('127.0.0.1'),
}));

vi.mock('@/lib/users', () => ({
  ensureUserRecord: ensureUserRecordMock,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  ne: vi.fn(),
  sql: vi.fn(),
  desc: vi.fn(),
}));

vi.mock('@/db', () => ({
  requireDb: () => ({
    insert: mockInsert,
    select: () => ({
      from: () => ({
        leftJoin: () => ({
          where: () => ({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
        where: () => vi.fn().mockResolvedValue([]),
      }),
    }),
  }),
}));

vi.mock('@/db/schema', () => ({
  featureRequests: { id: Symbol('featureRequests.id'), userId: Symbol('userId'), status: Symbol('status'), createdAt: Symbol('createdAt') },
  featureRequestVotes: Symbol('featureRequestVotes'),
  users: { id: Symbol('users.id') },
}));

/* ------------------------------------------------------------------ */

import { POST } from '@/app/api/feature-requests/route';

const VALID_DESCRIPTION =
  'It would be great if The Pit could show a replay speed control for completed bouts so users can review at their own pace.';

describe('feature-requests POST api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: 'user_123' });
    checkRateLimitMock.mockReturnValue({
      success: true,
      remaining: 9,
      resetAt: Date.now() + 3_600_000,
    });
    ensureUserRecordMock.mockResolvedValue(undefined);
  });

  function makeReq(body: unknown) {
    return new Request('http://localhost/api/feature-requests', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  function makeRawReq(body: string) {
    return new Request('http://localhost/api/feature-requests', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('H1: valid submission returns 200 with id', async () => {
    const res = await POST(
      makeReq({
        title: 'Replay speed control',
        description: VALID_DESCRIPTION,
        category: 'ui',
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.id).toBe(42);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_123',
        title: 'Replay speed control',
        category: 'ui',
      }),
    );
  });

  it('U1: invalid JSON returns 400', async () => {
    const res = await POST(makeRawReq('{bad'));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Invalid JSON.');
  });

  it('U2: title too short returns 400', async () => {
    const res = await POST(
      makeReq({ title: 'Hi', description: VALID_DESCRIPTION, category: 'ui' }),
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Title must be at least 5 characters.');
  });

  it('U3: title too long returns 400', async () => {
    const res = await POST(
      makeReq({
        title: 'x'.repeat(201),
        description: VALID_DESCRIPTION,
        category: 'ui',
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Title must be 200 characters or fewer.');
  });

  it('U4: description too short returns 400', async () => {
    const res = await POST(
      makeReq({
        title: 'A valid title',
        description: 'Too short.',
        category: 'ui',
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toBe(
      'Description must be at least 20 characters.',
    );
  });

  it('U5: description too long returns 400', async () => {
    const res = await POST(
      makeReq({
        title: 'A valid title',
        description: 'x'.repeat(3001),
        category: 'ui',
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toBe(
      'Description must be 3000 characters or fewer.',
    );
  });

  it('U6: invalid category returns 400', async () => {
    const res = await POST(
      makeReq({
        title: 'A valid title',
        description: VALID_DESCRIPTION,
        category: 'invalid',
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Invalid category.');
  });

  it('U7: unauthenticated returns 401', async () => {
    authMock.mockResolvedValue({ userId: null });

    const res = await POST(
      makeReq({
        title: 'A valid title',
        description: VALID_DESCRIPTION,
        category: 'ui',
      }),
    );
    expect(res.status).toBe(401);
    expect(await res.text()).toBe('Sign in required.');
  });

  it('U8: rate limited returns 429', async () => {
    checkRateLimitMock.mockReturnValue({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 3_600_000,
    });

    const res = await POST(
      makeReq({
        title: 'A valid title',
        description: VALID_DESCRIPTION,
        category: 'ui',
      }),
    );
    expect(res.status).toBe(429);
  });

  it('U9: UNSAFE_PATTERN in title returns 400', async () => {
    const res = await POST(
      makeReq({
        title: 'Check out https://evil.com for ideas',
        description: VALID_DESCRIPTION,
        category: 'ui',
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Title must not contain URLs or scripts.');
  });

  it('U10: UNSAFE_PATTERN in description returns 400', async () => {
    const res = await POST(
      makeReq({
        title: 'A valid title',
        description:
          'This feature is described at https://evil.com and it would be really great for the platform.',
        category: 'ui',
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toBe(
      'Description must not contain URLs or scripts.',
    );
  });

  it('U11: each valid category is accepted', async () => {
    const categories = ['agents', 'arena', 'presets', 'research', 'ui', 'other'];

    for (const cat of categories) {
      vi.clearAllMocks();
      authMock.mockResolvedValue({ userId: 'user_123' });
      checkRateLimitMock.mockReturnValue({
        success: true,
        remaining: 9,
        resetAt: Date.now() + 3_600_000,
      });
      ensureUserRecordMock.mockResolvedValue(undefined);

      const res = await POST(
        makeReq({
          title: 'A valid title',
          description: VALID_DESCRIPTION,
          category: cat,
        }),
      );
      expect(res.status).toBe(200);
    }
  });
});
