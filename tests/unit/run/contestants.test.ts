import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks -- Drizzle query chain
// ---------------------------------------------------------------------------

const { mockDb, mockReturning, mockWhere } = vi.hoisted(() => {
  const mockReturning = vi.fn().mockResolvedValue([]);
  const mockWhere = vi.fn().mockResolvedValue([]);

  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: mockReturning,
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: mockWhere,
      }),
    }),
  };
  return { mockDb, mockReturning, mockWhere };
});

vi.mock('@/db/schema', () => ({
  contestants: {
    id: 'id',
    runId: 'run_id',
    label: 'label',
    model: 'model',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'cont-nanoid-00000000'),
}));

import { addContestant, getContestantsForRun } from '@/lib/run/contestants';
import type { DbOrTx } from '@/db';
import type { RunId } from '@/lib/domain-ids';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeRunId = 'run-abc-000000000000' as RunId;

const validInput = {
  label: 'GPT-4o baseline',
  model: 'gpt-4o',
};

const fullInput = {
  label: 'Claude Sonnet tuned',
  model: 'claude-sonnet-4-20250514',
  provider: 'anthropic' as const,
  systemPrompt: 'You are an expert evaluator.',
  temperature: 0.7,
  maxTokens: 4096,
  toolAccess: ['web_search'],
  contextBundle: {
    documents: [
      { label: 'CV', content: 'Senior engineer with 10 years...', source: 'upload' },
    ],
  },
};

const fakeContestant = {
  id: 'cont-nanoid-00000000',
  runId: fakeRunId,
  label: 'GPT-4o baseline',
  model: 'gpt-4o',
  provider: null,
  systemPrompt: null,
  temperature: null,
  maxTokens: null,
  toolAccess: null,
  contextBundle: null,
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
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: mockWhere,
    }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('lib/run/contestants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockChains();
    mockReturning.mockResolvedValue([fakeContestant]);
    mockWhere.mockResolvedValue([]);
  });

  // ── addContestant ───────────────────────────────────────────────────────

  describe('addContestant', () => {
    it('persists a contestant with generated id and runId', async () => {
      const result = await addContestant(
        mockDb as unknown as DbOrTx,
        fakeRunId,
        validInput,
      );
      expect(result).toEqual(fakeContestant);
      expect(result.runId).toBe(fakeRunId);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('accepts all optional fields', async () => {
      const fullContestant = {
        ...fakeContestant,
        ...fullInput,
        id: 'cont-nanoid-00000000',
        runId: fakeRunId,
        createdAt: fakeContestant.createdAt,
      };
      mockReturning.mockResolvedValue([fullContestant]);

      const result = await addContestant(
        mockDb as unknown as DbOrTx,
        fakeRunId,
        fullInput,
      );
      expect(result.model).toBe('claude-sonnet-4-20250514');
      expect(result.temperature).toBe(0.7);
      expect(result.contextBundle).toBeDefined();
    });

    it('rejects empty label', async () => {
      await expect(
        addContestant(mockDb as unknown as DbOrTx, fakeRunId, {
          ...validInput,
          label: '',
        }),
      ).rejects.toThrow();
    });

    it('rejects empty model', async () => {
      await expect(
        addContestant(mockDb as unknown as DbOrTx, fakeRunId, {
          ...validInput,
          model: '',
        }),
      ).rejects.toThrow();
    });

    it('rejects temperature above 2', async () => {
      await expect(
        addContestant(mockDb as unknown as DbOrTx, fakeRunId, {
          ...validInput,
          temperature: 2.5,
        }),
      ).rejects.toThrow();
    });
  });

  // ── getContestantsForRun ────────────────────────────────────────────────

  describe('getContestantsForRun', () => {
    it('returns empty array when no contestants exist', async () => {
      mockWhere.mockResolvedValue([]);
      const result = await getContestantsForRun(
        mockDb as unknown as DbOrTx,
        fakeRunId,
      );
      expect(result).toEqual([]);
    });

    it('returns all contestants for a run', async () => {
      const contestants = [
        fakeContestant,
        { ...fakeContestant, id: 'cont-2', label: 'Claude baseline' },
      ];
      mockWhere.mockResolvedValue(contestants);

      const result = await getContestantsForRun(
        mockDb as unknown as DbOrTx,
        fakeRunId,
      );
      expect(result).toHaveLength(2);
    });
  });
});
