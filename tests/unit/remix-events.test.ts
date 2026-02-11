import { describe, expect, it, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Hoisted mocks                                                       */
/* ------------------------------------------------------------------ */

const {
  mockQueryResult,
  mockInsertValues,
  mockInsertReturning,
  applyCreditDeltaMock,
} = vi.hoisted(() => {
  // Single result mock that handles both .limit() and direct await
  const mockQueryResult = vi.fn().mockResolvedValue([]);
  const mockInsertReturning = vi.fn().mockResolvedValue([{ id: 1 }]);
  const mockInsertValues = vi
    .fn()
    .mockReturnValue({ returning: mockInsertReturning });
  return {
    mockQueryResult,
    mockInsertValues,
    mockInsertReturning,
    applyCreditDeltaMock: vi.fn().mockResolvedValue(undefined),
  };
});

// Build a query chain that works for both .where().limit() and .where() patterns
// Drizzle queries are thenable, so .where() can be awaited directly or chained with .limit()
function makeQueryChain() {
  // The where() return is both awaitable and chainable
  const whereResult = {
    limit: mockQueryResult,
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
      mockQueryResult().then(resolve, reject),
  };
  const fromResult = { where: vi.fn().mockReturnValue(whereResult) };
  const selectResult = { from: vi.fn().mockReturnValue(fromResult) };
  return selectResult;
}

vi.mock('@/db', () => ({
  requireDb: () => ({
    select: vi.fn().mockImplementation(() => makeQueryChain()),
    insert: vi.fn().mockReturnValue({ values: mockInsertValues }),
  }),
}));

vi.mock('@/db/schema', () => ({
  remixEvents: Symbol('remixEvents'),
  agents: Symbol('agents'),
}));

vi.mock('@/lib/credits', () => ({
  applyCreditDelta: applyCreditDeltaMock,
  CREDITS_ENABLED: true,
  MICRO_PER_CREDIT: 100,
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

/* ------------------------------------------------------------------ */

import { recordRemixEvent, getRemixStats } from '@/lib/remix-events';

describe('remix-events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult.mockResolvedValue([]);
    mockInsertReturning.mockResolvedValue([{ id: 1 }]);
  });

  describe('recordRemixEvent', () => {
    it('inserts a remix event row', async () => {
      const result = await recordRemixEvent({
        sourceAgentId: 'agent_source',
        remixedAgentId: 'agent_new',
        remixerUserId: 'user_123',
        outcome: 'completed',
      });

      expect(result.id).toBe(1);
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceAgentId: 'agent_source',
          remixedAgentId: 'agent_new',
          remixerUserId: 'user_123',
          outcome: 'completed',
        }),
      );
    });

    it('does not distribute rewards when source has no owner', async () => {
      mockQueryResult.mockResolvedValueOnce([{ ownerId: null }]);

      await recordRemixEvent({
        sourceAgentId: 'agent_source',
        remixedAgentId: 'agent_new',
        remixerUserId: 'user_123',
        outcome: 'completed',
      });

      expect(applyCreditDeltaMock).not.toHaveBeenCalled();
    });

    it('does not distribute rewards for self-clones', async () => {
      mockQueryResult.mockResolvedValueOnce([{ ownerId: 'user_123' }]);

      const result = await recordRemixEvent({
        sourceAgentId: 'agent_source',
        remixedAgentId: 'agent_new',
        remixerUserId: 'user_123',
        outcome: 'completed',
      });

      expect(result.rewarded).toBe(false);
      expect(applyCreditDeltaMock).not.toHaveBeenCalled();
    });

    it('does not distribute rewards for failed outcomes', async () => {
      mockQueryResult.mockResolvedValueOnce([{ ownerId: 'user_456' }]);

      const result = await recordRemixEvent({
        sourceAgentId: 'agent_source',
        remixedAgentId: null,
        remixerUserId: 'user_123',
        outcome: 'failed',
      });

      expect(result.rewarded).toBe(false);
      expect(applyCreditDeltaMock).not.toHaveBeenCalled();
    });

    it('records sourceOwnerId from agent lookup', async () => {
      mockQueryResult.mockResolvedValueOnce([{ ownerId: 'owner_789' }]);

      await recordRemixEvent({
        sourceAgentId: 'agent_source',
        remixedAgentId: 'agent_new',
        remixerUserId: 'user_123',
        outcome: 'completed',
      });

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ sourceOwnerId: 'owner_789' }),
      );
    });

    it('passes reason and metadata through', async () => {
      await recordRemixEvent({
        sourceAgentId: 'agent_source',
        remixedAgentId: 'agent_new',
        remixerUserId: 'user_123',
        outcome: 'completed',
        reason: 'user-initiated',
        metadata: { promptHash: '0xabc' },
      });

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'user-initiated',
          metadata: { promptHash: '0xabc' },
        }),
      );
    });
  });

  describe('getRemixStats', () => {
    it('returns default values when agent has no remixes', async () => {
      mockQueryResult.mockResolvedValueOnce([]);

      const stats = await getRemixStats('agent_none');
      expect(stats).toEqual({ remixCount: 0, totalRewardsMicro: 0 });
    });

    it('returns stats from DB query', async () => {
      mockQueryResult.mockResolvedValueOnce([
        { remixCount: 5, totalRewardsMicro: 500 },
      ]);

      const stats = await getRemixStats('agent_popular');
      expect(stats).toEqual({ remixCount: 5, totalRewardsMicro: 500 });
    });
  });
});
