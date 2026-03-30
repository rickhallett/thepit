import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { RubricId } from '@/lib/domain-ids';

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
  rubrics: {
    id: 'id',
    domain: 'domain',
    createdAt: 'created_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  desc: vi.fn((col: unknown) => ({ _desc: col })),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'rubric-nanoid-0000000'),
}));

import { createRubric, getRubric, listRubrics } from '@/lib/eval/rubrics';
import { createRubricSchema } from '@/lib/api-schemas';
import type { DbOrTx } from '@/db';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validCriteria = [
  {
    name: 'relevance',
    description: 'How relevant is the answer',
    weight: 0.5,
    scale: { min: 1, max: 5 },
  },
  {
    name: 'clarity',
    description: 'How clear is the answer',
    weight: 0.5,
    scale: { min: 1, max: 5 },
  },
];

const validInput = {
  name: 'Test Rubric',
  description: 'A test rubric',
  domain: 'testing',
  criteria: validCriteria,
};

const fakeRubric = {
  id: 'rubric-nanoid-0000000',
  name: 'Test Rubric',
  description: 'A test rubric',
  domain: 'testing',
  criteria: validCriteria,
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

describe('lib/eval/rubrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockChains();
    mockReturning.mockResolvedValue([fakeRubric]);
    mockSelectLimit.mockResolvedValue([]);
  });

  // -- createRubric ---------------------------------------------------------

  describe('createRubric', () => {
    it('persists a rubric with generated id', async () => {
      const result = await createRubric(mockDb as unknown as DbOrTx, validInput);
      expect(result).toEqual(fakeRubric);
      expect(result.id).toBe('rubric-nanoid-0000000');
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('accepts rubric with optional description', async () => {
      const input = { ...validInput, description: undefined };
      await createRubric(mockDb as unknown as DbOrTx, input);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });
  });

  // -- Zod validation (createRubricSchema) ----------------------------------

  describe('createRubricSchema validation', () => {
    it('validates weights sum to 1', () => {
      const bad = {
        ...validInput,
        criteria: [
          { ...validCriteria[0]!, weight: 0.3 },
          { ...validCriteria[1]!, weight: 0.3 },
        ],
      };
      const result = createRubricSchema.safeParse(bad);
      expect(result.success).toBe(false);
    });

    it('accepts weights that sum to ~1 within tolerance', () => {
      const ok = {
        ...validInput,
        criteria: [
          { ...validCriteria[0]!, weight: 0.333 },
          { ...validCriteria[1]!, weight: 0.333 },
          { name: 'third', description: 'Third', weight: 0.334, scale: { min: 1, max: 5 } },
        ],
      };
      const result = createRubricSchema.safeParse(ok);
      expect(result.success).toBe(true);
    });

    it('requires at least 1 criterion', () => {
      const bad = { ...validInput, criteria: [] };
      const result = createRubricSchema.safeParse(bad);
      expect(result.success).toBe(false);
    });

    it('rejects duplicate criterion names (case-insensitive)', () => {
      const bad = {
        ...validInput,
        criteria: [
          { ...validCriteria[0]!, name: 'Relevance' },
          { ...validCriteria[1]!, name: 'relevance' },
        ],
      };
      const result = createRubricSchema.safeParse(bad);
      expect(result.success).toBe(false);
    });

    it('rejects scale.min >= scale.max', () => {
      const bad = {
        ...validInput,
        criteria: [
          { ...validCriteria[0]!, scale: { min: 5, max: 5 } },
          { ...validCriteria[1]! },
        ],
      };
      const result = createRubricSchema.safeParse(bad);
      expect(result.success).toBe(false);
    });

    it('rejects scale labels outside scale range', () => {
      const bad = {
        ...validInput,
        criteria: [
          { ...validCriteria[0]!, scale: { min: 1, max: 5, labels: { '0': 'bad', '3': 'ok' } } },
          { ...validCriteria[1]! },
        ],
      };
      const result = createRubricSchema.safeParse(bad);
      expect(result.success).toBe(false);
    });

    it('accepts valid scale labels within range', () => {
      const ok = {
        ...validInput,
        criteria: [
          { ...validCriteria[0]!, scale: { min: 1, max: 5, labels: { '1': 'poor', '3': 'ok', '5': 'great' } } },
          { ...validCriteria[1]! },
        ],
      };
      const result = createRubricSchema.safeParse(ok);
      expect(result.success).toBe(true);
    });
  });

  // -- getRubric ------------------------------------------------------------

  describe('getRubric', () => {
    it('returns null for missing id', async () => {
      mockSelectLimit.mockResolvedValue([]);
      const result = await getRubric(
        mockDb as unknown as DbOrTx,
        'nonexistent' as unknown as RubricId,
      );
      expect(result).toBeNull();
    });

    it('returns the rubric when found', async () => {
      mockSelectLimit.mockResolvedValue([fakeRubric]);
      const result = await getRubric(
        mockDb as unknown as DbOrTx,
        fakeRubric.id as unknown as RubricId,
      );
      expect(result).toEqual(fakeRubric);
    });
  });

  // -- listRubrics ----------------------------------------------------------

  describe('listRubrics', () => {
    it('returns empty array when no rubrics exist', async () => {
      const result = await listRubrics(mockDb as unknown as DbOrTx);
      expect(result).toEqual([]);
    });

    it('calls select with default limit', async () => {
      await listRubrics(mockDb as unknown as DbOrTx);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it('passes domain filter when specified', async () => {
      const { mockWhere } = resetMockChains();
      const mockOffset = vi.fn().mockResolvedValue([fakeRubric]);
      const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });

      await listRubrics(mockDb as unknown as DbOrTx, { domain: 'testing' });
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });
  });
});
