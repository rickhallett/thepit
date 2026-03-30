import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { RunId, ContestantId, EvaluationId } from '@/lib/domain-ids';

// ---------------------------------------------------------------------------
// Hoisted mocks -- Drizzle query chain
// ---------------------------------------------------------------------------

const { mockDb, mockReturning } = vi.hoisted(() => {
  const mockReturning = vi.fn().mockResolvedValue([]);
  const mockGroupBy = vi.fn().mockResolvedValue([]);
  const mockWhere = vi.fn();

  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: mockReturning,
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: mockWhere.mockReturnValue([]),
        groupBy: mockGroupBy,
      }),
    }),
  };
  return { mockDb, mockReturning, mockGroupBy, mockWhere };
});

vi.mock('@/db/schema', () => ({
  failureTags: {
    id: 'id',
    runId: 'run_id',
    contestantId: 'contestant_id',
    category: 'category',
  },
  failureCategory: {
    enumValues: [
      'wrong_answer',
      'partial_answer',
      'refusal',
      'off_topic',
      'unsafe_output',
      'hallucination',
      'format_violation',
      'context_misuse',
      'instruction_violation',
    ],
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  sql: vi.fn(),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'ftag-nanoid-000000000'),
}));

import { addFailureTag, getFailureTagsForRun, getFailureTagsForContestant, getFailureDistribution } from '@/lib/eval/failure-tags';
import type { DbOrTx } from '@/db';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeTag = {
  id: 'ftag-nanoid-000000000',
  runId: 'run-000000000000000000',
  contestantId: 'cont-00000000000000000',
  category: 'wrong_answer' as const,
  description: 'Gave incorrect result',
  source: 'manual',
  evaluationId: null,
  createdAt: new Date(),
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

  const mockWhere = vi.fn().mockResolvedValue([]);
  const mockGroupBy = vi.fn().mockResolvedValue([]);
  const mockFrom = vi.fn().mockReturnValue({
    where: mockWhere,
    groupBy: mockGroupBy,
  });
  mockDb.select.mockReturnValue({ from: mockFrom });

  return { mockFrom, mockWhere, mockGroupBy };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('lib/eval/failure-tags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockChains();
    mockReturning.mockResolvedValue([fakeTag]);
  });

  // -- addFailureTag ---------------------------------------------------------

  describe('addFailureTag', () => {
    it('persists with category and source', async () => {
      const result = await addFailureTag(mockDb as unknown as DbOrTx, {
        runId: 'run-000000000000000000' as RunId,
        contestantId: 'cont-00000000000000000' as ContestantId,
        category: 'wrong_answer',
        description: 'Gave incorrect result',
        source: 'manual',
      });

      expect(result).toEqual(fakeTag);
      expect(result.category).toBe('wrong_answer');
      expect(result.source).toBe('manual');
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('links evaluationId when provided', async () => {
      const tagWithEval = {
        ...fakeTag,
        source: 'judge',
        evaluationId: 'eval-00000000000000000',
      };
      mockReturning.mockResolvedValue([tagWithEval]);

      const result = await addFailureTag(mockDb as unknown as DbOrTx, {
        runId: 'run-000000000000000000' as RunId,
        contestantId: 'cont-00000000000000000' as ContestantId,
        category: 'wrong_answer',
        description: 'Gave incorrect result',
        source: 'judge',
        evaluationId: 'eval-00000000000000000' as EvaluationId,
      });

      expect(result.evaluationId).toBe('eval-00000000000000000');
      expect(result.source).toBe('judge');
    });
  });

  // -- getFailureTagsForRun --------------------------------------------------

  describe('getFailureTagsForRun', () => {
    it('returns all tags for a run', async () => {
      const { mockWhere } = resetMockChains();
      mockWhere.mockResolvedValue([fakeTag, { ...fakeTag, id: 'ftag-2', category: 'refusal' }]);

      const result = await getFailureTagsForRun(
        mockDb as unknown as DbOrTx,
        'run-000000000000000000' as RunId,
      );

      expect(result).toHaveLength(2);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });
  });

  // -- getFailureTagsForContestant -------------------------------------------

  describe('getFailureTagsForContestant', () => {
    it('returns all tags for a contestant', async () => {
      const { mockWhere } = resetMockChains();
      mockWhere.mockResolvedValue([fakeTag]);

      const result = await getFailureTagsForContestant(
        mockDb as unknown as DbOrTx,
        'cont-00000000000000000' as ContestantId,
      );

      expect(result).toHaveLength(1);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });
  });

  // -- getFailureDistribution ------------------------------------------------

  describe('getFailureDistribution', () => {
    it('returns correct counts per category', async () => {
      const { mockGroupBy } = resetMockChains();
      mockGroupBy.mockResolvedValue([
        { category: 'wrong_answer', count: 3 },
        { category: 'refusal', count: 1 },
      ]);

      const result = await getFailureDistribution(mockDb as unknown as DbOrTx);

      expect(result.wrong_answer).toBe(3);
      expect(result.refusal).toBe(1);
      expect(result.hallucination).toBe(0);
      expect(result.off_topic).toBe(0);
    });
  });
});
