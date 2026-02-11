import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, freeBoutPoolTable } = vi.hoisted(() => {
  const pool = {
    id: 'id',
    date: 'date',
    used: 'used',
    maxDaily: 'max_daily',
    updatedAt: 'updated_at',
  };
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return { mockDb: db, freeBoutPoolTable: pool };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  freeBoutPool: freeBoutPoolTable,
}));

const loadPool = async () => import('@/lib/free-bout-pool');

describe('free-bout-pool', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    process.env.FREE_BOUT_POOL_MAX = '500';
  });

  const setupExistingPool = (used: number, maxDaily = 500) => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 1, date: '2026-02-11', used, maxDaily, updatedAt: new Date() }],
        }),
      }),
    }));
  };

  const setupNoPool = () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }));
    mockDb.insert.mockImplementation(() => ({
      values: () => ({
        onConflictDoNothing: () => ({
          returning: async () => [{ id: 1, date: '2026-02-11', used: 0, maxDaily: 500, updatedAt: new Date() }],
        }),
      }),
    }));
  };

  describe('getFreeBoutPoolStatus', () => {
    it('returns remaining bouts when pool exists', async () => {
      setupExistingPool(100);
      const { getFreeBoutPoolStatus } = await loadPool();
      const status = await getFreeBoutPoolStatus();
      expect(status.used).toBe(100);
      expect(status.max).toBe(500);
      expect(status.remaining).toBe(400);
      expect(status.exhausted).toBe(false);
    });

    it('returns exhausted when pool is full', async () => {
      setupExistingPool(500);
      const { getFreeBoutPoolStatus } = await loadPool();
      const status = await getFreeBoutPoolStatus();
      expect(status.remaining).toBe(0);
      expect(status.exhausted).toBe(true);
    });

    it('creates pool row when none exists', async () => {
      setupNoPool();
      const { getFreeBoutPoolStatus } = await loadPool();
      const status = await getFreeBoutPoolStatus();
      expect(status.used).toBe(0);
      expect(status.remaining).toBe(500);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('consumeFreeBout', () => {
    it('returns consumed=true when pool has capacity', async () => {
      setupExistingPool(100);
      mockDb.update.mockImplementation(() => ({
        set: () => ({
          where: () => ({
            returning: async () => [{ used: 101, maxDaily: 500 }],
          }),
        }),
      }));

      const { consumeFreeBout } = await loadPool();
      const result = await consumeFreeBout();
      expect(result.consumed).toBe(true);
      if (result.consumed) {
        expect(result.remaining).toBe(399);
      }
    });

    it('returns consumed=false when pool is exhausted', async () => {
      setupExistingPool(500);
      mockDb.update.mockImplementation(() => ({
        set: () => ({
          where: () => ({
            returning: async () => [],
          }),
        }),
      }));

      const { consumeFreeBout } = await loadPool();
      const result = await consumeFreeBout();
      expect(result.consumed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('FREE_BOUT_POOL_MAX', () => {
    it('defaults to 500', async () => {
      delete process.env.FREE_BOUT_POOL_MAX;
      const { FREE_BOUT_POOL_MAX } = await loadPool();
      expect(FREE_BOUT_POOL_MAX).toBe(500);
    });

    it('reads from env', async () => {
      process.env.FREE_BOUT_POOL_MAX = '1000';
      const { FREE_BOUT_POOL_MAX } = await loadPool();
      expect(FREE_BOUT_POOL_MAX).toBe(1000);
    });
  });
});
