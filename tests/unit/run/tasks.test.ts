import { describe, expect, it, vi, beforeEach } from 'vitest';

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
  tasks: {
    id: 'id',
    name: 'name',
    domain: 'domain',
    createdAt: 'created_at',
  },
  expectedOutputShape: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  desc: vi.fn((col: unknown) => ({ _desc: col })),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-nanoid-00000000'),
}));

import { createTask, getTask, listTasks } from '@/lib/run/tasks';
import type { DbOrTx } from '@/db';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validInput = {
  name: 'Evaluate CV bullet',
  prompt: 'Score this CV bullet against the role requirement.',
  domain: 'job-application',
};

const fullInput = {
  name: 'Full task',
  description: 'A thorough task definition',
  prompt: 'Do the thing.',
  constraints: ['No hallucination', 'Stay on topic'],
  expectedOutputShape: 'json' as const,
  acceptanceCriteria: ['Correct answer', 'Well structured'],
  domain: 'evaluation',
};

const fakeTask = {
  id: 'test-nanoid-00000000',
  name: 'Evaluate CV bullet',
  description: null,
  prompt: 'Score this CV bullet against the role requirement.',
  constraints: null,
  expectedOutputShape: null,
  acceptanceCriteria: null,
  domain: 'job-application',
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
  const mockWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
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

describe('lib/run/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockChains();
    mockReturning.mockResolvedValue([fakeTask]);
    mockSelectLimit.mockResolvedValue([]);
  });

  // ── createTask ──────────────────────────────────────────────────────────

  describe('createTask', () => {
    it('persists and returns a task with generated id', async () => {
      const result = await createTask(mockDb as unknown as DbOrTx, validInput);
      expect(result).toEqual(fakeTask);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('passes all fields including optional ones', async () => {
      const fullTask = { ...fakeTask, ...fullInput, id: 'test-nanoid-00000000' };
      mockReturning.mockResolvedValue([fullTask]);

      const result = await createTask(mockDb as unknown as DbOrTx, fullInput);
      expect(result.name).toBe('Full task');
      expect(result.constraints).toEqual(['No hallucination', 'Stay on topic']);
    });

    it('rejects empty name', async () => {
      await expect(
        createTask(mockDb as unknown as DbOrTx, { ...validInput, name: '' }),
      ).rejects.toThrow();
    });

    it('rejects empty prompt', async () => {
      await expect(
        createTask(mockDb as unknown as DbOrTx, { ...validInput, prompt: '' }),
      ).rejects.toThrow();
    });

    it('rejects name over 256 characters', async () => {
      await expect(
        createTask(mockDb as unknown as DbOrTx, {
          ...validInput,
          name: 'x'.repeat(257),
        }),
      ).rejects.toThrow();
    });
  });

  // ── getTask ─────────────────────────────────────────────────────────────

  describe('getTask', () => {
    it('returns null for missing id', async () => {
      mockSelectLimit.mockResolvedValue([]);
      const result = await getTask(
        mockDb as unknown as DbOrTx,
        'nonexistent' as any,
      );
      expect(result).toBeNull();
    });

    it('returns the task when found', async () => {
      mockSelectLimit.mockResolvedValue([fakeTask]);
      const result = await getTask(
        mockDb as unknown as DbOrTx,
        fakeTask.id as any,
      );
      expect(result).toEqual(fakeTask);
    });
  });

  // ── listTasks ───────────────────────────────────────────────────────────

  describe('listTasks', () => {
    it('returns empty array when no tasks exist', async () => {
      const result = await listTasks(mockDb as unknown as DbOrTx);
      expect(result).toEqual([]);
    });

    it('calls with default limit and offset', async () => {
      await listTasks(mockDb as unknown as DbOrTx);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it('passes domain filter when specified', async () => {
      const { mockFrom } = resetMockChains();

      // For domain-filtered queries, the chain goes:
      // select().from(tasks).where(eq(domain, val)).orderBy().limit().offset()
      const mockOffset = vi.fn().mockResolvedValue([fakeTask]);
      const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({
        orderBy: mockOrderBy,
      });
      mockFrom.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
      });

      const result = await listTasks(mockDb as unknown as DbOrTx, {
        domain: 'job-application',
      });

      // The domain filter should have been applied
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });
  });
});
