import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  };
  return { mockDb: db };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  featureRequests: {
    id: Symbol('featureRequests.id'),
    userId: Symbol('userId'),
    title: Symbol('title'),
    description: Symbol('description'),
    category: Symbol('category'),
    status: Symbol('status'),
    createdAt: Symbol('createdAt'),
  },
  featureRequestVotes: {
    id: Symbol('featureRequestVotes.id'),
    featureRequestId: Symbol('featureRequestId'),
    userId: Symbol('userId'),
  },
  users: {
    id: Symbol('users.id'),
    displayName: Symbol('displayName'),
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  ne: vi.fn(),
  and: vi.fn(),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values, as: () => 'vote_count' }),
    { raw: (s: string) => s },
  ),
  desc: vi.fn(),
}));

describe('lib/feature-requests', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.delete.mockReset();
  });

  describe('listFeatureRequests', () => {
    it('returns formatted requests with vote status', async () => {
      // First select: feature requests with joins
      const mockOrderBy = vi.fn().mockResolvedValue([
        {
          id: 1,
          title: 'Feature A',
          description: 'Desc A',
          category: 'ui',
          status: 'pending',
          createdAt: new Date('2026-01-01'),
          userId: 'user_1',
          displayName: 'Alice',
          voteCount: 3,
        },
      ]);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockLeftJoin = vi.fn().mockReturnValue({ where: mockWhere });
      const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin });
      mockDb.select.mockReturnValueOnce({ from: mockFrom });

      // Second select: user votes (authenticated)
      const mockVoteWhere = vi.fn().mockResolvedValue([{ featureRequestId: 1 }]);
      const mockVoteFrom = vi.fn().mockReturnValue({ where: mockVoteWhere });
      mockDb.select.mockReturnValueOnce({ from: mockVoteFrom });

      const { listFeatureRequests } = await import('@/lib/feature-requests');
      const result = await listFeatureRequests('user_1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        title: 'Feature A',
        description: 'Desc A',
        category: 'ui',
        status: 'pending',
        createdAt: new Date('2026-01-01'),
        displayName: 'Alice',
        voteCount: 3,
        userVoted: true,
      });
    });

    it('returns Anonymous when displayName is null', async () => {
      const mockOrderBy = vi.fn().mockResolvedValue([
        {
          id: 2,
          title: 'Feature B',
          description: 'Desc B',
          category: 'agents',
          status: 'pending',
          createdAt: new Date('2026-01-02'),
          userId: 'user_2',
          displayName: null,
          voteCount: 0,
        },
      ]);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockLeftJoin = vi.fn().mockReturnValue({ where: mockWhere });
      const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin });
      mockDb.select.mockReturnValueOnce({ from: mockFrom });

      const { listFeatureRequests } = await import('@/lib/feature-requests');
      const result = await listFeatureRequests(null);

      expect(result[0]!.displayName).toBe('Anonymous');
      expect(result[0]!.userVoted).toBe(false);
    });
  });

  describe('createFeatureRequest', () => {
    it('inserts and returns the generated id', async () => {
      const mockReturning = vi.fn().mockResolvedValue([{ id: 42 }]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      mockDb.insert.mockReturnValue({ values: mockValues });

      const { createFeatureRequest } = await import('@/lib/feature-requests');
      const result = await createFeatureRequest('user_1', {
        title: 'New Feature',
        description: 'A long description',
        category: 'ui',
      });

      expect(result).toEqual({ id: 42 });
      expect(mockValues).toHaveBeenCalledWith({
        userId: 'user_1',
        title: 'New Feature',
        description: 'A long description',
        category: 'ui',
      });
    });
  });

  describe('toggleFeatureRequestVote', () => {
    it('inserts vote when none exists and returns count', async () => {
      // Existence check: no existing vote
      const existLimit = vi.fn().mockResolvedValue([]);
      const existWhere = vi.fn().mockReturnValue({ limit: existLimit });
      const existFrom = vi.fn().mockReturnValue({ where: existWhere });
      mockDb.select.mockReturnValueOnce({ from: existFrom });

      // Insert
      const mockOnConflict = vi.fn().mockResolvedValue(undefined);
      const mockInsertValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflict });
      mockDb.insert.mockReturnValue({ values: mockInsertValues });

      // Count
      const countWhere = vi.fn().mockResolvedValue([{ count: 1 }]);
      const countFrom = vi.fn().mockReturnValue({ where: countWhere });
      mockDb.select.mockReturnValueOnce({ from: countFrom });

      const { toggleFeatureRequestVote } = await import('@/lib/feature-requests');
      const result = await toggleFeatureRequestVote('user_1', 1);

      expect(result).toEqual({ voted: true, voteCount: 1 });
    });

    it('deletes vote when one exists and returns count', async () => {
      // Existence check: found
      const existLimit = vi.fn().mockResolvedValue([{ id: 99 }]);
      const existWhere = vi.fn().mockReturnValue({ limit: existLimit });
      const existFrom = vi.fn().mockReturnValue({ where: existWhere });
      mockDb.select.mockReturnValueOnce({ from: existFrom });

      // Delete
      const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
      mockDb.delete.mockReturnValue({ where: mockDeleteWhere });

      // Count
      const countWhere = vi.fn().mockResolvedValue([{ count: 0 }]);
      const countFrom = vi.fn().mockReturnValue({ where: countWhere });
      mockDb.select.mockReturnValueOnce({ from: countFrom });

      const { toggleFeatureRequestVote } = await import('@/lib/feature-requests');
      const result = await toggleFeatureRequestVote('user_1', 1);

      expect(result).toEqual({ voted: false, voteCount: 0 });
    });
  });
});
