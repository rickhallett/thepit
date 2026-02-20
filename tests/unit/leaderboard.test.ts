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
    {
      id: 'preset:darwin-special:lamarck',
      name: 'Lamarck',
      presetId: 'darwin-special',
      presetName: 'Darwin Special',
      tier: 'free',
      color: '#0f0',
      systemPrompt: 'I am Lamarck',
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

const now = new Date();

const boutRows = [
  { id: 'b1', presetId: 'darwin-special', ownerId: 'user1', createdAt: now, agentLineup: null },
  { id: 'b2', presetId: 'darwin-special', ownerId: 'user1', createdAt: now, agentLineup: null },
  { id: 'b3', presetId: 'darwin-special', ownerId: 'user2', createdAt: now, agentLineup: null },
];

const voteRows = [
  { boutId: 'b1', agentId: 'darwin', userId: 'user1', createdAt: now },
  { boutId: 'b1', agentId: 'darwin', userId: 'user2', createdAt: now },
  { boutId: 'b1', agentId: 'lamarck', userId: 'user3', createdAt: now },
  { boutId: 'b2', agentId: 'lamarck', userId: 'user1', createdAt: now },
];

const agentRows = [
  { id: 'a1', ownerId: 'user1', archived: false, createdAt: now },
];

const userRows = [
  { id: 'user1', email: 'kai@oceanheart.ai', displayName: 'Kai', createdAt: now },
  { id: 'user2', email: 'bob@test.com', displayName: null, createdAt: now },
];

const referralRows = [
  { id: 1, referrerId: 'user1', referredId: 'user3', code: 'abc', credited: false, createdAt: now },
];

/**
 * Set up the mock DB select chain. Each call to db.select() returns the
 * next result set from the provided arrays (cycled per range).
 */
const _setupSelectForRange = () => {
  let callIndex = 0;
  // The leaderboard queries 5 tables per range (bouts, votes, referrals, agents, users)
  // and iterates over 3 ranges = 15 calls total.
  const results = [
    // Range: all
    boutRows, voteRows, referralRows, agentRows, userRows,
    // Range: week
    boutRows, voteRows, referralRows, agentRows, userRows,
    // Range: day
    boutRows, voteRows, referralRows, agentRows, userRows,
  ];

  mockDb.select.mockImplementation(() => ({
    from: () => {
      const idx = callIndex;
      callIndex++;
      const data = results[idx] ?? [];
      return {
        where: () => data,
        then: (resolve: (v: unknown) => void) => resolve(data),
        [Symbol.toStringTag]: 'Promise',
        // Support direct await (no .where())
      };
    },
  }));
};

// Helper: make the mock return an awaitable from().where() chain
const setupDbMock = () => {
  let callIndex = 0;
  const results = [
    boutRows, voteRows, referralRows, agentRows, userRows,
    boutRows, voteRows, referralRows, agentRows, userRows,
    boutRows, voteRows, referralRows, agentRows, userRows,
  ];

  mockDb.select.mockImplementation(() => ({
    from: () => {
      const idx = callIndex++;
      const data = results[idx] ?? [];
      // Return a thenable that also has .where()
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

describe('lib/leaderboard', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
  });

  it('returns leaderboard data with all 3 ranges', async () => {
    setupDbMock();
    const { getLeaderboardData } = await import('@/lib/leaderboard');
    const data = await getLeaderboardData();

    expect(data).toHaveProperty('all');
    expect(data).toHaveProperty('week');
    expect(data).toHaveProperty('day');
    expect(data.all.pit).toBeInstanceOf(Array);
    expect(data.all.players).toBeInstanceOf(Array);
  });

  it('correctly counts bouts per agent', async () => {
    setupDbMock();
    const { getLeaderboardData } = await import('@/lib/leaderboard');
    const data = await getLeaderboardData();

    // Both preset agents appear in all 3 bouts
    const darwin = data.all.pit.find((e) => e.id === 'preset:darwin-special:darwin');
    const lamarck = data.all.pit.find((e) => e.id === 'preset:darwin-special:lamarck');
    expect(darwin).toBeDefined();
    expect(lamarck).toBeDefined();
    expect(darwin!.bouts).toBe(3);
    expect(lamarck!.bouts).toBe(3);
  });

  it('correctly counts wins (agent with most votes per bout wins)', async () => {
    setupDbMock();
    const { getLeaderboardData } = await import('@/lib/leaderboard');
    const data = await getLeaderboardData();

    // b1: darwin has 2 votes, lamarck has 1 → darwin wins b1
    // b2: lamarck has 1 vote, darwin has 0 → lamarck wins b2
    const darwin = data.all.pit.find((e) => e.id === 'preset:darwin-special:darwin');
    const lamarck = data.all.pit.find((e) => e.id === 'preset:darwin-special:lamarck');
    expect(darwin!.wins).toBe(1);
    expect(lamarck!.wins).toBe(1);
  });

  it('returns cached data on second call within TTL', async () => {
    setupDbMock();
    const { getLeaderboardData } = await import('@/lib/leaderboard');

    const first = await getLeaderboardData();
    // Reset mock to verify it's NOT called again
    mockDb.select.mockReset();

    const second = await getLeaderboardData();
    expect(second).toBe(first); // Same reference (cached)
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('players sorted by boutsCreated descending', async () => {
    setupDbMock();
    const { getLeaderboardData } = await import('@/lib/leaderboard');
    const data = await getLeaderboardData();

    const players = data.all.players;
    expect(players.length).toBeGreaterThanOrEqual(2);
    // user1 has 2 bouts, user2 has 1 bout
    for (let i = 1; i < players.length; i++) {
      expect(players[i - 1]!.boutsCreated).toBeGreaterThanOrEqual(players[i]!.boutsCreated);
    }
  });
});
