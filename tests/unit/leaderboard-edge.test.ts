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
  bouts: { id: 'id', presetId: 'preset_id', ownerId: 'owner_id', createdAt: 'created_at', agentLineup: 'agent_lineup' },
  agents: { id: 'id', archived: 'archived', createdAt: 'created_at', ownerId: 'owner_id' },
  users: { id: 'id', email: 'email', displayName: 'display_name', createdAt: 'created_at' },
  winnerVotes: { boutId: 'bout_id', agentId: 'agent_id', userId: 'user_id', createdAt: 'created_at' },
  referrals: { referrerId: 'referrer_id', createdAt: 'created_at' },
}));

vi.mock('@/lib/presets', () => ({
  ALL_PRESETS: [
    {
      id: 'darwin-special',
      name: 'Darwin Special',
      agents: [
        { id: 'darwin', name: 'Darwin', systemPrompt: 'I am Darwin', color: '#f00' },
        { id: 'lamarck', name: 'Lamarck', systemPrompt: 'I am Lamarck', color: '#0f0' },
      ],
      maxTurns: 12,
      tier: 'free',
    },
  ],
  ARENA_PRESET_ID: 'arena',
}));

vi.mock('@/lib/agent-registry', () => ({
  getAgentSnapshots: vi.fn().mockResolvedValue([
    {
      id: 'preset:darwin-special:darwin',
      name: 'Darwin',
      presetId: 'darwin-special',
      presetName: 'Darwin Special',
      tier: 'free',
      color: '#f00',
      systemPrompt: 'I am Darwin',
      responseLength: 'standard',
      responseFormat: 'plain',
    },
  ]),
  buildPresetAgentId: vi.fn((presetId: string, agentId: string) => `preset:${presetId}:${agentId}`),
  parsePresetAgentId: vi.fn((id: string) => {
    if (!id.startsWith('preset:')) return null;
    const [, presetId, agentId] = id.split(':');
    return { presetId, agentId };
  }),
}));

vi.mock('@/lib/users', () => ({
  maskEmail: vi.fn((email: string) => `${email[0]}***${email.slice(email.indexOf('@'))}`),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const setupDbEmpty = () => {
  mockDb.select.mockImplementation(() => ({
    from: () => {
      const thenable = {
        where: () => Promise.resolve([]),
        then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
          Promise.resolve([]).then(resolve, reject),
        catch: (reject: (e: unknown) => void) => Promise.resolve([]).catch(reject),
      };
      return thenable;
    },
  }));
};

const setupDbWithData = (dataSets: unknown[][]) => {
  let callIndex = 0;
  mockDb.select.mockImplementation(() => ({
    from: () => {
      const idx = callIndex++;
      const data = dataSets[idx] ?? [];
      const thenable = {
        where: () => Promise.resolve(data),
        then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
          Promise.resolve(data).then(resolve, reject),
        catch: (reject: (e: unknown) => void) => Promise.resolve(data).catch(reject),
      };
      return thenable;
    },
  }));
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('lib/leaderboard edge cases', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
  });

  // H1: Cache expires after 5 min
  it('cache expires after 5 min → fresh data fetched', async () => {
    vi.useFakeTimers();
    try {
      // First call: populate cache with empty data
      setupDbEmpty();
      const { getLeaderboardData } = await import('@/lib/leaderboard');
      const first = await getLeaderboardData();
      expect(first.all.pit).toEqual([]);

      // Advance past TTL (5 min = 300_000 ms)
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);

      // Second call should fetch fresh data (mock is still returning empty)
      setupDbEmpty();
      const second = await getLeaderboardData();
      // It's a new object because cache expired
      expect(second).not.toBe(first);
      expect(second.all.pit).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  // U1: Empty database → returns empty arrays
  it('empty database → returns empty arrays for all ranges', async () => {
    setupDbEmpty();
    const { getLeaderboardData } = await import('@/lib/leaderboard');
    const data = await getLeaderboardData();

    for (const range of ['all', 'week', 'day'] as const) {
      expect(data[range].pit).toEqual([]);
      expect(data[range].players).toEqual([]);
    }
  });

  // U2: Division-by-zero guard → agents with 0 bouts
  it('agents with 0 bouts do not produce NaN winRate', async () => {
    const now = new Date();
    // Only votes (no bout rows) — agent gets votes but 0 bouts
    const dataSets = [
      // Range: all — bouts, votes, referrals, agents, users
      [],
      [{ boutId: 'b1', agentId: 'darwin', userId: 'u1', createdAt: now }],
      [],
      [],
      [],
      // Range: week
      [], [], [], [], [],
      // Range: day
      [], [], [], [], [],
    ];
    setupDbWithData(dataSets);

    const { getLeaderboardData } = await import('@/lib/leaderboard');
    const data = await getLeaderboardData();

    // The agent should have 0 bouts but the code uses `stats.bouts || 1` for winRate
    for (const entry of data.all.pit) {
      expect(Number.isFinite(entry.winRate)).toBe(true);
      expect(Number.isNaN(entry.winRate)).toBe(false);
    }
  });
});
