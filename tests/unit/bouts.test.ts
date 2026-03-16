import { describe, expect, it, vi, beforeEach } from 'vitest';

// Hoisted mocks - drizzle chain: db.select().from(bouts).where(eq(bouts.id, X)).limit(1)
const { mockDb, mockSelectLimit } = vi.hoisted(() => {
  const mockSelectLimit = vi.fn().mockResolvedValue([]);
  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: mockSelectLimit,
        }),
      }),
    }),
  };
  return { mockDb, mockSelectLimit };
});

vi.mock('@/db', () => ({
  db: mockDb,
}));

vi.mock('@/db/schema', () => ({
  bouts: { id: 'id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
}));

import { getBoutById } from '@/lib/bouts';

describe('lib/bouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-establish chain after clearAllMocks
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: mockSelectLimit,
        }),
      }),
    });
    mockSelectLimit.mockResolvedValue([]);
  });

  it('returns null when no bout matches', async () => {
    mockSelectLimit.mockResolvedValue([]);
    const result = await getBoutById('nonexistent');
    expect(result).toBeNull();
  });

  it('returns the bout row when found', async () => {
    const fakeBout = {
      id: 'abc123',
      presetId: 'debate-classic',
      status: 'completed',
      transcript: [],
      ownerId: 'user-1',
      topic: 'cats vs dogs',
      responseLength: null,
      responseFormat: null,
      maxTurns: 6,
      agentLineup: null,
      shareLine: 'A heated debate',
      shareGeneratedAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };
    mockSelectLimit.mockResolvedValue([fakeBout]);

    const result = await getBoutById('abc123');
    expect(result).toEqual(fakeBout);
  });

  it('calls the drizzle chain with correct structure', async () => {
    await getBoutById('test-id');
    expect(mockDb.select).toHaveBeenCalledOnce();
  });

  it('returns null when db is null', async () => {
    vi.doMock('@/db', () => ({ db: null }));
    const { getBoutById: getBoutByIdNullDb } = await import('@/lib/bouts');
    const result = await getBoutByIdNullDb('any-id');
    expect(result).toBeNull();
    vi.doMock('@/db', () => ({ db: mockDb }));
  });

  it('propagates database errors', async () => {
    mockSelectLimit.mockRejectedValue(new Error('connection refused'));
    await expect(getBoutById('err-id')).rejects.toThrow('connection refused');
  });
});
