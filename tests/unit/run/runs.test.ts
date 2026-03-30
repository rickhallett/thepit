import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { RunId } from '@/lib/domain-ids';

// ---------------------------------------------------------------------------
// Hoisted mocks -- Drizzle query chain
// ---------------------------------------------------------------------------

const { mockDb, mockReturning, mockSelectLimit } = vi.hoisted(() => {
  const mockReturning = vi.fn().mockResolvedValue([]);
  const mockSelectLimit = vi.fn().mockResolvedValue([]);

  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: mockReturning,
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: mockSelectLimit,
        }),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  };
  return { mockDb, mockReturning, mockSelectLimit };
});

vi.mock('@/db/schema', () => ({
  runs: {
    id: 'id',
    taskId: 'task_id',
    status: 'status',
    ownerId: 'owner_id',
    createdAt: 'created_at',
  },
  runStatus: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  and: vi.fn((...args: unknown[]) => ({ _and: args })),
  desc: vi.fn((col: unknown) => ({ _desc: col })),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'run-nanoid-000000000'),
}));

import { createRun, getRun, listRuns } from '@/lib/run/runs';
import type { DbOrTx } from '@/db';
import type { TaskId } from '@/lib/domain-ids';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeTaskId = 'task-abc-000000000000' as TaskId;

const fakeRun = {
  id: 'run-nanoid-000000000',
  taskId: fakeTaskId,
  status: 'pending',
  ownerId: null,
  startedAt: null,
  completedAt: null,
  error: null,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetMockChains() {
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: mockReturning,
    }),
  });

  const mockOffset = vi.fn().mockResolvedValue([]);
  const mockLimitList = vi.fn().mockReturnValue({ offset: mockOffset });
  const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimitList });
  const mockWhere = vi.fn().mockReturnValue({
    limit: mockSelectLimit,
    orderBy: mockOrderBy,
  });
  const mockFrom = vi.fn().mockReturnValue({
    where: mockWhere,
    orderBy: mockOrderBy,
  });
  mockDb.select.mockReturnValue({ from: mockFrom });

  return { mockFrom, mockWhere, mockOrderBy, mockLimitList, mockOffset };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('lib/run/runs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockChains();
    mockReturning.mockResolvedValue([fakeRun]);
    mockSelectLimit.mockResolvedValue([]);
  });

  // ── createRun ───────────────────────────────────────────────────────────

  describe('createRun', () => {
    it('persists a run with pending status and generated id', async () => {
      const result = await createRun(mockDb as unknown as DbOrTx, {
        taskId: fakeTaskId,
      });
      expect(result).toEqual(fakeRun);
      expect(result.status).toBe('pending');
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('accepts optional ownerId', async () => {
      const runWithOwner = { ...fakeRun, ownerId: 'user-123' };
      mockReturning.mockResolvedValue([runWithOwner]);

      const result = await createRun(mockDb as unknown as DbOrTx, {
        taskId: fakeTaskId,
        ownerId: 'user-123',
      });
      expect(result.ownerId).toBe('user-123');
    });

    it('accepts optional metadata', async () => {
      const meta = { source: 'test', priority: 1 };
      const runWithMeta = { ...fakeRun, metadata: meta };
      mockReturning.mockResolvedValue([runWithMeta]);

      const result = await createRun(mockDb as unknown as DbOrTx, {
        taskId: fakeTaskId,
        metadata: meta,
      });
      expect(result.metadata).toEqual(meta);
    });
  });

  // ── getRun ──────────────────────────────────────────────────────────────

  describe('getRun', () => {
    it('returns null for missing id', async () => {
      mockSelectLimit.mockResolvedValue([]);
      const result = await getRun(
        mockDb as unknown as DbOrTx,
        'nonexistent' as unknown as RunId,
      );
      expect(result).toBeNull();
    });

    it('returns the run when found', async () => {
      mockSelectLimit.mockResolvedValue([fakeRun]);
      const result = await getRun(
        mockDb as unknown as DbOrTx,
        fakeRun.id as unknown as RunId,
      );
      expect(result).toEqual(fakeRun);
    });
  });

  // ── listRuns ────────────────────────────────────────────────────────────

  describe('listRuns', () => {
    it('returns empty array when no runs exist', async () => {
      const result = await listRuns(mockDb as unknown as DbOrTx);
      expect(result).toEqual([]);
    });

    it('calls select with default limit and offset', async () => {
      await listRuns(mockDb as unknown as DbOrTx);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it('passes status filter when specified', async () => {
      const { mockWhere } = resetMockChains();

      // For filtered queries with conditions, chain goes:
      // select().from().where(and(...)).orderBy().limit().offset()
      const mockOffset = vi.fn().mockResolvedValue([fakeRun]);
      const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      mockWhere.mockReturnValue({
        orderBy: mockOrderBy,
      });

      await listRuns(mockDb as unknown as DbOrTx, { status: 'pending' });
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });
  });
});
