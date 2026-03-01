import { describe, expect, it, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Hoisted mocks                                                       */
/* ------------------------------------------------------------------ */

const {
  checkRateLimitMock,
  getClientIdentifierMock,
  authMock,
  sha256HexMock,
  mockSelect,
} = vi.hoisted(() => {
  return {
    checkRateLimitMock: vi.fn(),
    getClientIdentifierMock: vi.fn(),
    authMock: vi.fn(),
    sha256HexMock: vi.fn().mockResolvedValue('0xhashed_ip'),
    mockSelect: vi.fn(),
  };
});

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIdentifier: getClientIdentifierMock,
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/lib/hash', () => ({
  sha256Hex: sha256HexMock,
}));

vi.mock('@/db', () => ({
  requireDb: () => ({
    select: mockSelect,
    insert: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock('@/db/schema', () => ({
  bouts: { id: Symbol('bouts.id'), transcript: Symbol('bouts.transcript') },
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

describe('reactions bout validation', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    sha256HexMock.mockResolvedValue('0xhashed_ip');
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

  it('returns 404 for non-existent boutId', async () => {
    // Bout lookup returns empty array → 404
    const boutLimit = vi.fn().mockResolvedValue([]);
    const boutWhere = vi.fn().mockReturnValue({ limit: boutLimit });
    const boutFrom = vi.fn().mockReturnValue({ where: boutWhere });

    mockSelect.mockReturnValueOnce({ from: boutFrom });

    const res = await POST(
      makeReq({ boutId: 'bout-nonexistent001', turnIndex: 0, reactionType: 'heart' }),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Bout not found.');
  });

  it('returns 400 for turnIndex beyond transcript length', async () => {
    // Bout exists with 3-turn transcript, request turnIndex 99
    const boutLimit = vi.fn().mockResolvedValue([{
      id: 'bout-test-valid001',
      transcript: [
        { turn: 0, agentId: 'a1', agentName: 'Agent1', text: 'hello' },
        { turn: 1, agentId: 'a2', agentName: 'Agent2', text: 'world' },
        { turn: 2, agentId: 'a1', agentName: 'Agent1', text: 'foo' },
      ],
    }]);
    const boutWhere = vi.fn().mockReturnValue({ limit: boutLimit });
    const boutFrom = vi.fn().mockReturnValue({ where: boutWhere });

    mockSelect.mockReturnValueOnce({ from: boutFrom });

    const res = await POST(
      makeReq({ boutId: 'bout-test-valid001', turnIndex: 99, reactionType: 'fire' }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid turn index.');
  });

  it('returns 400 for negative turnIndex', async () => {
    // Negative turnIndex is caught by Zod schema validation before
    // the bout lookup — defense-in-depth means two layers reject it.
    // No DB mock needed: parseValidBody returns early.
    const res = await POST(
      makeReq({ boutId: 'bout-test-valid002', turnIndex: -1, reactionType: 'heart' }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('turnIndex must be a non-negative integer.');
  });
});
