import { describe, expect, it, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Hoisted mocks                                                       */
/* ------------------------------------------------------------------ */

const {
  authMock,
  mockOnConflictDoNothing,
  mockValues,
  mockInsert,
} = vi.hoisted(() => {
  const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
  const mockValues = vi
    .fn()
    .mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
  return {
    authMock: vi.fn(),
    mockOnConflictDoNothing,
    mockValues,
    mockInsert,
  };
});

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/db', () => ({
  requireDb: () => ({ insert: mockInsert }),
}));

vi.mock('@/db/schema', () => ({
  winnerVotes: Symbol('winnerVotes'),
}));

/* ------------------------------------------------------------------ */

import { POST } from '@/app/api/winner-vote/route';

describe('winner-vote success paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: 'user_123' });
  });

  function makeReq(body: unknown) {
    return new Request('http://localhost/api/winner-vote', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('H1: authenticated user casts valid vote → 200 { ok: true }', async () => {
    const res = await POST(makeReq({ boutId: 'bout-1', agentId: 'agent-a' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    expect(mockValues).toHaveBeenCalledWith({
      boutId: 'bout-1',
      agentId: 'agent-a',
      userId: 'user_123',
    });
    expect(mockOnConflictDoNothing).toHaveBeenCalled();
  });

  it('H2: duplicate vote resolves via onConflictDoNothing → 200 { ok: true }', async () => {
    // onConflictDoNothing already returns undefined (no error), simulating idempotent insert
    const res = await POST(makeReq({ boutId: 'bout-1', agentId: 'agent-a' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockOnConflictDoNothing).toHaveBeenCalled();
  });

  it('U1: unauthenticated user → 401 "Sign in required."', async () => {
    authMock.mockResolvedValue({ userId: null });

    const res = await POST(makeReq({ boutId: 'bout-1', agentId: 'agent-a' }));

    expect(res.status).toBe(401);
    expect(await res.text()).toBe('Sign in required.');
  });

  it('U2: missing boutId → 400', async () => {
    const res = await POST(makeReq({ agentId: 'agent-a' }));

    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Missing boutId or agentId.');
  });

  it('U3: missing agentId → 400', async () => {
    const res = await POST(makeReq({ boutId: 'bout-1' }));

    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Missing boutId or agentId.');
  });
});
