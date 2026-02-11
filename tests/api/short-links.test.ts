import { describe, expect, it, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Hoisted mocks                                                       */
/* ------------------------------------------------------------------ */

const {
  checkRateLimitMock,
  createShortLinkMock,
  mockSelectLimit,
  mockSelectWhere,
  mockSelectFrom,
} = vi.hoisted(() => {
  const mockSelectLimit = vi.fn().mockResolvedValue([{ id: 'bout_123' }]);
  const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
  return {
    checkRateLimitMock: vi.fn(),
    createShortLinkMock: vi.fn(),
    mockSelectLimit,
    mockSelectWhere,
    mockSelectFrom,
  };
});

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIdentifier: vi.fn().mockReturnValue('127.0.0.1'),
}));

vi.mock('@/lib/short-links', () => ({
  createShortLink: createShortLinkMock,
}));

vi.mock('@/db', () => ({
  requireDb: () => ({
    select: vi.fn().mockReturnValue({ from: mockSelectFrom }),
  }),
}));

vi.mock('@/db/schema', () => ({
  bouts: Symbol('bouts'),
}));

/* ------------------------------------------------------------------ */

import { POST } from '@/app/api/short-links/route';

describe('POST /api/short-links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimitMock.mockReturnValue({
      success: true,
      remaining: 29,
      resetAt: Date.now() + 60_000,
    });
    createShortLinkMock.mockResolvedValue({
      slug: 'aBcDeFgH',
      created: true,
    });
    mockSelectLimit.mockResolvedValue([{ id: 'bout_123' }]);
  });

  function makeReq(body: unknown) {
    return new Request('http://localhost/api/short-links', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('H1: creates short link for valid boutId', async () => {
    const res = await POST(makeReq({ boutId: 'bout_123' }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({ slug: 'aBcDeFgH', created: true });
    expect(createShortLinkMock).toHaveBeenCalledWith('bout_123');
  });

  it('H2: returns 200 for existing short link', async () => {
    createShortLinkMock.mockResolvedValue({
      slug: 'existing',
      created: false,
    });

    const res = await POST(makeReq({ boutId: 'bout_123' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ slug: 'existing', created: false });
  });

  it('U1: invalid JSON returns 400', async () => {
    const req = new Request('http://localhost/api/short-links', {
      method: 'POST',
      body: '{bad',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Invalid JSON.');
  });

  it('U2: missing boutId returns 400', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Valid boutId required.');
  });

  it('U3: boutId too long returns 400', async () => {
    const res = await POST(makeReq({ boutId: 'x'.repeat(22) }));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Valid boutId required.');
  });

  it('U4: nonexistent bout returns 404', async () => {
    mockSelectLimit.mockResolvedValueOnce([]);

    const res = await POST(makeReq({ boutId: 'nonexistent_bout_id' }));
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Bout not found.');
  });

  it('U5: rate limited returns 429', async () => {
    checkRateLimitMock.mockReturnValue({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });

    const res = await POST(makeReq({ boutId: 'bout_123' }));
    expect(res.status).toBe(429);
    expect(await res.text()).toBe('Too many requests. Try again later.');
  });
});
