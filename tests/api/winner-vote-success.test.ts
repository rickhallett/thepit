import { describe, expect, it, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Hoisted mocks                                                       */
/* ------------------------------------------------------------------ */

const {
  authMock,
  mockOnConflictDoNothing,
  mockValues,
  mockInsert,
  mockSelectLimit,
} = vi.hoisted(() => {
  const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
  const mockValues = vi
    .fn()
    .mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
  const mockSelectLimit = vi.fn().mockResolvedValue([{
    id: 'bout-1',
    transcript: [
      { turn: 0, agentId: 'agent-a', agentName: 'Alpha', text: 'Hello' },
      { turn: 1, agentId: 'agent-b', agentName: 'Bravo', text: 'World' },
    ],
    agentLineup: null,
  }]);
  return {
    authMock: vi.fn(),
    mockOnConflictDoNothing,
    mockValues,
    mockInsert,
    mockSelectLimit,
  };
});

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

vi.mock('@/db', () => ({
  requireDb: () => ({
    insert: mockInsert,
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
  winnerVotes: Symbol('winnerVotes'),
  bouts: {
    id: Symbol('bouts.id'),
    transcript: Symbol('bouts.transcript'),
    agentLineup: Symbol('bouts.agentLineup'),
  },
}));

/* ------------------------------------------------------------------ */

import { POST } from '@/app/api/winner-vote/route';

describe('winner-vote success paths', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Re-establish mock implementations wiped by resetAllMocks
    mockOnConflictDoNothing.mockResolvedValue(undefined);
    mockValues.mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
    mockInsert.mockReturnValue({ values: mockValues });

    authMock.mockResolvedValue({ userId: 'user_123' });
    // Default: bout exists with agent-a and agent-b as participants
    mockSelectLimit.mockResolvedValue([{
      id: 'bout-1',
      transcript: [
        { turn: 0, agentId: 'agent-a', agentName: 'Alpha', text: 'Hello' },
        { turn: 1, agentId: 'agent-b', agentName: 'Bravo', text: 'World' },
      ],
      agentLineup: null,
    }]);
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

  it('H3: vote on non-existent bout → 404', async () => {
    mockSelectLimit.mockResolvedValue([]);

    const res = await POST(makeReq({ boutId: 'ghost-bout', agentId: 'agent-a' }));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Bout not found.' });
  });

  it('U1: unauthenticated user → 401 "Authentication required."', async () => {
    authMock.mockResolvedValue({ userId: null });

    const res = await POST(makeReq({ boutId: 'bout-1', agentId: 'agent-a' }));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('U2: missing boutId → 400', async () => {
    const res = await POST(makeReq({ agentId: 'agent-a' }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing boutId or agentId.' });
  });

  it('U3: missing agentId → 400', async () => {
    const res = await POST(makeReq({ boutId: 'bout-1' }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing boutId or agentId.' });
  });

  it('rejects vote for agent not in bout transcript → 403', async () => {
    // Bout exists with agent-a and agent-b, but we vote for agent-x
    const res = await POST(makeReq({ boutId: 'bout-1', agentId: 'agent-x' }));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Agent was not a participant in this bout.' });
    // Must NOT have attempted the insert
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects vote for agent not in arena lineup → 403', async () => {
    // Arena bout: transcript is empty but agentLineup has participants
    mockSelectLimit.mockResolvedValue([{
      id: 'bout-1',
      transcript: [],
      agentLineup: [
        { id: 'arena-1', name: 'Gladiator', systemPrompt: 'Fight!' },
        { id: 'arena-2', name: 'Champion', systemPrompt: 'Win!' },
      ],
    }]);

    const res = await POST(makeReq({ boutId: 'bout-1', agentId: 'intruder' }));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Agent was not a participant in this bout.' });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('accepts vote for agent found only in arena lineup', async () => {
    // Arena bout: agent is in lineup but not yet in transcript (edge case: early vote)
    mockSelectLimit.mockResolvedValue([{
      id: 'bout-1',
      transcript: [],
      agentLineup: [
        { id: 'arena-1', name: 'Gladiator', systemPrompt: 'Fight!' },
        { id: 'arena-2', name: 'Champion', systemPrompt: 'Win!' },
      ],
    }]);

    const res = await POST(makeReq({ boutId: 'bout-1', agentId: 'arena-1' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockValues).toHaveBeenCalledWith({
      boutId: 'bout-1',
      agentId: 'arena-1',
      userId: 'user_123',
    });
  });
});
