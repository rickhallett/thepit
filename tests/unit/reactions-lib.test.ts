import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
  };
  return { mockDb: db };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  reactions: {
    boutId: 'bout_id',
    turnIndex: 'turn_index',
    reactionType: 'reaction_type',
  },
}));

const setupSelect = (rows: Array<{ turnIndex: number; reactionType: string; count: number }>) => {
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        groupBy: () => Promise.resolve(rows),
      }),
    }),
  }));
};

describe('lib/reactions', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
  });

  it('returns counts grouped by turn', async () => {
    setupSelect([
      { turnIndex: 0, reactionType: 'heart', count: 3 },
      { turnIndex: 0, reactionType: 'fire', count: 1 },
    ]);

    const { getReactionCounts } = await import('@/lib/reactions');
    const map = await getReactionCounts('bout-1');

    expect(map[0]).toEqual({ heart: 3, fire: 1 });
  });

  it('returns empty map when no reactions', async () => {
    setupSelect([]);

    const { getReactionCounts } = await import('@/lib/reactions');
    const map = await getReactionCounts('bout-empty');

    expect(Object.keys(map)).toHaveLength(0);
  });

  it('handles multiple turns correctly', async () => {
    setupSelect([
      { turnIndex: 0, reactionType: 'heart', count: 2 },
      { turnIndex: 1, reactionType: 'fire', count: 5 },
      { turnIndex: 2, reactionType: 'heart', count: 1 },
      { turnIndex: 2, reactionType: 'fire', count: 3 },
    ]);

    const { getReactionCounts } = await import('@/lib/reactions');
    const map = await getReactionCounts('bout-multi');

    expect(map[0]).toEqual({ heart: 2, fire: 0 });
    expect(map[1]).toEqual({ heart: 0, fire: 5 });
    expect(map[2]).toEqual({ heart: 1, fire: 3 });
  });

  it('throws on unknown reaction type via assertNever guard', async () => {
    // If a corrupted or unexpected reaction type comes from the DB,
    // the assertNever guard in the switch statement should throw
    // rather than silently dropping the data.
    setupSelect([
      { turnIndex: 0, reactionType: 'lol', count: 1 },
    ]);

    const { getReactionCounts } = await import('@/lib/reactions');
    await expect(getReactionCounts('bout-corrupt')).rejects.toThrow(
      /Unknown reaction type: lol/,
    );
  });
});
