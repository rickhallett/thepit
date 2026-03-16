import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
  };
  return { mockDb: db };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  bouts: {
    id: 'bouts.id',
    transcript: 'bouts.transcript',
    agentLineup: 'bouts.agentLineup',
  },
  winnerVotes: {
    boutId: 'winnerVotes.boutId',
    agentId: 'winnerVotes.agentId',
    userId: 'winnerVotes.userId',
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => args),
  eq: vi.fn((a: unknown, b: unknown) => [a, b]),
  sql: vi.fn(),
}));

describe('castWinnerVote', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
  });

  it('returns error when bout not found', async () => {
    const boutLimit = vi.fn().mockResolvedValue([]);
    const boutWhere = vi.fn().mockReturnValue({ limit: boutLimit });
    const boutFrom = vi.fn().mockReturnValue({ where: boutWhere });
    mockDb.select.mockReturnValue({ from: boutFrom });

    const { castWinnerVote } = await import('@/lib/winner-votes');
    const result = await castWinnerVote({
      boutId: 'ghost-bout',
      agentId: 'agent-a',
      userId: 'user_1',
    });

    expect(result).toEqual({ error: 'Bout not found.', status: 404 });
  });

  it('returns error when agent did not participate', async () => {
    const boutLimit = vi.fn().mockResolvedValue([{
      id: 'bout-1',
      transcript: [
        { turn: 0, agentId: 'agent-a', agentName: 'Alpha', text: 'Hello' },
      ],
      agentLineup: null,
    }]);
    const boutWhere = vi.fn().mockReturnValue({ limit: boutLimit });
    const boutFrom = vi.fn().mockReturnValue({ where: boutWhere });
    mockDb.select.mockReturnValue({ from: boutFrom });

    const { castWinnerVote } = await import('@/lib/winner-votes');
    const result = await castWinnerVote({
      boutId: 'bout-1',
      agentId: 'agent-x',
      userId: 'user_1',
    });

    expect(result).toEqual({ error: 'Agent was not a participant in this bout.', status: 403 });
  });

  it('succeeds when agent is in transcript', async () => {
    const boutLimit = vi.fn().mockResolvedValue([{
      id: 'bout-1',
      transcript: [
        { turn: 0, agentId: 'agent-a', agentName: 'Alpha', text: 'Hello' },
        { turn: 1, agentId: 'agent-b', agentName: 'Bravo', text: 'World' },
      ],
      agentLineup: null,
    }]);
    const boutWhere = vi.fn().mockReturnValue({ limit: boutLimit });
    const boutFrom = vi.fn().mockReturnValue({ where: boutWhere });
    mockDb.select.mockReturnValue({ from: boutFrom });

    const mockOnConflict = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflict });
    mockDb.insert.mockReturnValue({ values: mockValues });

    const { castWinnerVote } = await import('@/lib/winner-votes');
    const result = await castWinnerVote({
      boutId: 'bout-1',
      agentId: 'agent-a',
      userId: 'user_1',
    });

    expect(result).toEqual({ ok: true });
    expect(mockValues).toHaveBeenCalledWith({
      boutId: 'bout-1',
      agentId: 'agent-a',
      userId: 'user_1',
    });
    expect(mockOnConflict).toHaveBeenCalled();
  });

  it('succeeds when agent is in lineup but not transcript', async () => {
    const boutLimit = vi.fn().mockResolvedValue([{
      id: 'bout-1',
      transcript: [],
      agentLineup: [
        { id: 'arena-1', name: 'Gladiator', systemPrompt: 'Fight!' },
      ],
    }]);
    const boutWhere = vi.fn().mockReturnValue({ limit: boutLimit });
    const boutFrom = vi.fn().mockReturnValue({ where: boutWhere });
    mockDb.select.mockReturnValue({ from: boutFrom });

    const mockOnConflict = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflict });
    mockDb.insert.mockReturnValue({ values: mockValues });

    const { castWinnerVote } = await import('@/lib/winner-votes');
    const result = await castWinnerVote({
      boutId: 'bout-1',
      agentId: 'arena-1',
      userId: 'user_1',
    });

    expect(result).toEqual({ ok: true });
  });
});
