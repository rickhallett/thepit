import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
  };
  return { mockDb: db };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  winnerVotes: {
    boutId: 'bout_id',
    agentId: 'agent_id',
    userId: 'user_id',
  },
}));

const setupSelectGroupBy = (rows: Array<{ agentId: string; count: number }>) => {
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        groupBy: () => Promise.resolve(rows),
      }),
    }),
  }));
};

const setupSelectLimit = (rows: Array<{ agentId: string }>) => {
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(rows),
      }),
    }),
  }));
};

describe('lib/winner-votes', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
  });

  describe('getWinnerVoteCounts', () => {
    it('returns counts per agent', async () => {
      setupSelectGroupBy([
        { agentId: 'agent-a', count: 5 },
        { agentId: 'agent-b', count: 3 },
      ]);

      const { getWinnerVoteCounts } = await import('@/lib/winner-votes');
      const map = await getWinnerVoteCounts('bout-1');

      expect(map).toEqual({ 'agent-a': 5, 'agent-b': 3 });
    });

    it('returns empty map when no votes', async () => {
      setupSelectGroupBy([]);

      const { getWinnerVoteCounts } = await import('@/lib/winner-votes');
      const map = await getWinnerVoteCounts('bout-empty');

      expect(map).toEqual({});
    });
  });

  describe('getUserWinnerVote', () => {
    it('returns agentId when user voted', async () => {
      setupSelectLimit([{ agentId: 'agent-a' }]);

      const { getUserWinnerVote } = await import('@/lib/winner-votes');
      const result = await getUserWinnerVote('bout-1', 'user-1');

      expect(result).toBe('agent-a');
    });

    it('returns null when user has not voted', async () => {
      setupSelectLimit([]);

      const { getUserWinnerVote } = await import('@/lib/winner-votes');
      const result = await getUserWinnerVote('bout-1', 'user-none');

      expect(result).toBeNull();
    });
  });
});
