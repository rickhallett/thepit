import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockDb, mockRequireDb } = vi.hoisted(() => {
  const mockSelectLimit = vi.fn().mockResolvedValue([]);
  const mockSelectOrderBy = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  const mockSelectWhere = vi.fn().mockReturnValue({
    limit: mockSelectLimit,
    orderBy: mockSelectOrderBy,
  });
  const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });
  const mockValues = vi.fn().mockResolvedValue(undefined);
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

  const db = {
    select: mockSelect,
    insert: mockInsert,
    _selectFrom: mockSelectFrom,
    _selectWhere: mockSelectWhere,
    _selectOrderBy: mockSelectOrderBy,
    _selectLimit: mockSelectLimit,
    _values: mockValues,
  };
  return { mockDb: db, mockRequireDb: vi.fn(() => db) };
});

vi.mock('@/db', () => ({
  db: mockDb,
  requireDb: mockRequireDb,
}));

vi.mock('@/db/schema', () => ({
  bouts: {
    id: 'id',
    status: 'status',
    updatedAt: 'updated_at',
    createdAt: 'created_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  desc: vi.fn((col: unknown) => ({ _desc: col })),
}));

import { insertBout, boutExists, getCompletedBoutSummaries } from '@/lib/bouts';

describe('lib/bouts DAL functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Re-establish chain after clearAllMocks
    mockDb.select.mockReturnValue({ from: mockDb._selectFrom });
    mockDb._selectFrom.mockReturnValue({ where: mockDb._selectWhere });
    mockDb._selectWhere.mockReturnValue({
      limit: mockDb._selectLimit,
      orderBy: mockDb._selectOrderBy,
    });
    mockDb._selectOrderBy.mockReturnValue({ limit: mockDb._selectLimit });
    mockDb._selectLimit.mockResolvedValue([]);
    mockDb._values.mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({ values: mockDb._values });
  });

  // ================================================================
  // insertBout
  // ================================================================
  describe('insertBout', () => {
    it('calls db.insert(bouts).values() with provided values', async () => {
      const values = {
        id: 'bout-1',
        presetId: 'preset-1',
        status: 'running' as const,
        transcript: [],
        ownerId: 'user-1',
        topic: 'test topic',
        responseLength: 'short',
        responseFormat: 'spaced',
      };

      await insertBout(values);

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'id' }),
      );
      expect(mockDb._values).toHaveBeenCalledWith(values);
    });

    it('propagates database errors', async () => {
      mockDb._values.mockRejectedValue(new Error('connection refused'));

      await expect(
        insertBout({
          id: 'bout-err',
          presetId: 'preset-1',
          status: 'running',
          transcript: [],
          ownerId: null,
        }),
      ).rejects.toThrow('connection refused');
    });
  });

  // ================================================================
  // boutExists
  // ================================================================
  describe('boutExists', () => {
    it('returns true when bout is found', async () => {
      mockDb._selectLimit.mockResolvedValue([{ id: 'bout-1' }]);
      const result = await boutExists('bout-1');
      expect(result).toBe(true);
    });

    it('returns false when bout is not found', async () => {
      mockDb._selectLimit.mockResolvedValue([]);
      const result = await boutExists('nonexistent');
      expect(result).toBe(false);
    });

    it('calls select chain with correct structure', async () => {
      await boutExists('check-id');
      expect(mockDb.select).toHaveBeenCalledOnce();
      expect(mockDb._selectFrom).toHaveBeenCalledOnce();
      expect(mockDb._selectWhere).toHaveBeenCalledOnce();
      expect(mockDb._selectLimit).toHaveBeenCalledWith(1);
    });
  });

  // ================================================================
  // getCompletedBoutSummaries
  // ================================================================
  describe('getCompletedBoutSummaries', () => {
    it('returns completed bout summaries', async () => {
      const fakeBouts = [
        { id: 'bout-1', updatedAt: new Date('2026-01-01') },
        { id: 'bout-2', updatedAt: new Date('2026-01-02') },
      ];
      mockDb._selectLimit.mockResolvedValue(fakeBouts);

      const result = await getCompletedBoutSummaries(1000);
      expect(result).toEqual(fakeBouts);
    });

    it('passes limit to the query chain', async () => {
      mockDb._selectLimit.mockResolvedValue([]);
      await getCompletedBoutSummaries(500);
      expect(mockDb._selectLimit).toHaveBeenCalledWith(500);
    });

    it('calls select/where/orderBy/limit chain', async () => {
      mockDb._selectLimit.mockResolvedValue([]);
      await getCompletedBoutSummaries(100);
      expect(mockDb.select).toHaveBeenCalledOnce();
      expect(mockDb._selectFrom).toHaveBeenCalledOnce();
      expect(mockDb._selectWhere).toHaveBeenCalledOnce();
      expect(mockDb._selectOrderBy).toHaveBeenCalledOnce();
    });
  });
});
