import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  };
  db.transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
  return { mockDb: db };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  bouts: { id: 'bouts.id', transcript: 'bouts.transcript' },
  reactions: {
    id: 'reactions.id',
    boutId: 'reactions.boutId',
    turnIndex: 'reactions.turnIndex',
    reactionType: 'reactions.reactionType',
    clientFingerprint: 'reactions.clientFingerprint',
    userId: 'reactions.userId',
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => args),
  eq: vi.fn((a: unknown, b: unknown) => [a, b]),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    { raw: (s: string) => s },
  ),
  desc: vi.fn(),
}));

vi.mock('@/lib/api-utils', () => ({
  assertNever: (value: never, message: string) => { throw new Error(message); },
}));

describe('toggleReaction', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.delete.mockReset();
    mockDb.transaction.mockReset();
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof mockDb) => unknown) => fn(mockDb));
  });

  it('returns error when bout not found', async () => {
    // Bout lookup returns empty
    const boutLimit = vi.fn().mockResolvedValue([]);
    const boutWhere = vi.fn().mockReturnValue({ limit: boutLimit });
    const boutFrom = vi.fn().mockReturnValue({ where: boutWhere });
    mockDb.select.mockReturnValueOnce({ from: boutFrom });

    const { toggleReaction } = await import('@/lib/reactions');
    const result = await toggleReaction({
      boutId: 'ghost-bout',
      turnIndex: 0,
      reactionType: 'heart',
      userId: null,
      clientFingerprint: 'anon:hash',
    });

    expect(result).toEqual({ ok: false, error: 'Bout not found.', status: 404 });
  });

  it('returns error when turn index is out of range', async () => {
    const boutLimit = vi.fn().mockResolvedValue([{
      id: 'bout-1',
      transcript: [{ turn: 0, agentId: 'a1', text: 'hi' }],
    }]);
    const boutWhere = vi.fn().mockReturnValue({ limit: boutLimit });
    const boutFrom = vi.fn().mockReturnValue({ where: boutWhere });
    mockDb.select.mockReturnValueOnce({ from: boutFrom });

    const { toggleReaction } = await import('@/lib/reactions');
    const result = await toggleReaction({
      boutId: 'bout-1',
      turnIndex: 5,
      reactionType: 'heart',
      userId: null,
      clientFingerprint: 'anon:hash',
    });

    expect(result).toEqual({ ok: false, error: 'Invalid turn index.', status: 400 });
  });

  it('inserts new reaction when none exists (added)', async () => {
    // Call 1: bout lookup
    const boutLimit = vi.fn().mockResolvedValue([{
      id: 'bout-1',
      transcript: [{ turn: 0, agentId: 'a1', text: 'hi' }, { turn: 1, agentId: 'a2', text: 'yo' }],
    }]);
    const boutWhere = vi.fn().mockReturnValue({ limit: boutLimit });
    const boutFrom = vi.fn().mockReturnValue({ where: boutWhere });

    // Call 2: reaction existence check - empty
    const existLimit = vi.fn().mockResolvedValue([]);
    const existWhere = vi.fn().mockReturnValue({ limit: existLimit });
    const existFrom = vi.fn().mockReturnValue({ where: existWhere });

    // Call 3: counts query
    const countsWhere = vi.fn().mockResolvedValue([{ heart: 1, fire: 0 }]);
    const countsFrom = vi.fn().mockReturnValue({ where: countsWhere });

    mockDb.select
      .mockReturnValueOnce({ from: boutFrom })
      .mockReturnValueOnce({ from: existFrom })
      .mockReturnValueOnce({ from: countsFrom });

    // Insert chain
    const mockOnConflict = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflict });
    mockDb.insert.mockReturnValue({ values: mockValues });

    const { toggleReaction } = await import('@/lib/reactions');
    const result = await toggleReaction({
      boutId: 'bout-1',
      turnIndex: 0,
      reactionType: 'heart',
      userId: 'user_abc',
      clientFingerprint: 'user_abc',
    });

    expect(result).toEqual({
      ok: true,
      action: 'added',
      counts: { heart: 1, fire: 0 },
    });
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({
      boutId: 'bout-1',
      turnIndex: 0,
      reactionType: 'heart',
      userId: 'user_abc',
      clientFingerprint: 'user_abc',
    });
  });

  it('deletes existing reaction (removed)', async () => {
    // Call 1: bout lookup
    const boutLimit = vi.fn().mockResolvedValue([{
      id: 'bout-1',
      transcript: [{ turn: 0, agentId: 'a1', text: 'hi' }],
    }]);
    const boutWhere = vi.fn().mockReturnValue({ limit: boutLimit });
    const boutFrom = vi.fn().mockReturnValue({ where: boutWhere });

    // Call 2: reaction existence check - found
    const existLimit = vi.fn().mockResolvedValue([{ id: 42 }]);
    const existWhere = vi.fn().mockReturnValue({ limit: existLimit });
    const existFrom = vi.fn().mockReturnValue({ where: existWhere });

    // Call 3: counts query
    const countsWhere = vi.fn().mockResolvedValue([{ heart: 0, fire: 0 }]);
    const countsFrom = vi.fn().mockReturnValue({ where: countsWhere });

    mockDb.select
      .mockReturnValueOnce({ from: boutFrom })
      .mockReturnValueOnce({ from: existFrom })
      .mockReturnValueOnce({ from: countsFrom });

    // Delete chain
    const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
    mockDb.delete.mockReturnValue({ where: mockDeleteWhere });

    const { toggleReaction } = await import('@/lib/reactions');
    const result = await toggleReaction({
      boutId: 'bout-1',
      turnIndex: 0,
      reactionType: 'heart',
      userId: null,
      clientFingerprint: 'anon:hash',
    });

    expect(result).toEqual({
      ok: true,
      action: 'removed',
      counts: { heart: 0, fire: 0 },
    });
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it('returns correct counts after toggle', async () => {
    // Bout exists with 2 turns
    const boutLimit = vi.fn().mockResolvedValue([{
      id: 'bout-1',
      transcript: [{ turn: 0, agentId: 'a1', text: 'hi' }, { turn: 1, agentId: 'a2', text: 'yo' }],
    }]);
    const boutWhere = vi.fn().mockReturnValue({ limit: boutLimit });
    const boutFrom = vi.fn().mockReturnValue({ where: boutWhere });

    // No existing reaction
    const existLimit = vi.fn().mockResolvedValue([]);
    const existWhere = vi.fn().mockReturnValue({ limit: existLimit });
    const existFrom = vi.fn().mockReturnValue({ where: existWhere });

    // Counts: 3 hearts, 2 fires
    const countsWhere = vi.fn().mockResolvedValue([{ heart: 3, fire: 2 }]);
    const countsFrom = vi.fn().mockReturnValue({ where: countsWhere });

    mockDb.select
      .mockReturnValueOnce({ from: boutFrom })
      .mockReturnValueOnce({ from: existFrom })
      .mockReturnValueOnce({ from: countsFrom });

    const mockOnConflict = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflict });
    mockDb.insert.mockReturnValue({ values: mockValues });

    const { toggleReaction } = await import('@/lib/reactions');
    const result = await toggleReaction({
      boutId: 'bout-1',
      turnIndex: 1,
      reactionType: 'fire',
      userId: null,
      clientFingerprint: 'anon:hash',
    });

    expect(result).toEqual({
      ok: true,
      action: 'added',
      counts: { heart: 3, fire: 2 },
    });
  });
});
