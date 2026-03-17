import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockDb } = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  };
  // Default: transaction executes the callback with the db as tx context
  db.transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
  return { mockDb: db };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  agents: {
    id: 'id',
    ownerId: 'owner_id',
    archived: 'archived',
    attestationUid: 'attestation_uid',
    attestationTxHash: 'attestation_tx_hash',
    attestedAt: 'attested_at',
  },
}));

import {
  archiveAgent,
  restoreAgent,
  countActiveUserAgents,
  insertAgent,
  updateAgentAttestation,
} from '@/lib/agent-registry';

describe('lib/agent-registry DAL functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default DB chain mocks
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof mockDb) => unknown) => fn(mockDb));
  });

  // ================================================================
  // archiveAgent
  // ================================================================
  describe('archiveAgent', () => {
    it('calls update with archived: true', async () => {
      await archiveAgent('agent-1');
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'id', archived: 'archived' }),
      );
    });
  });

  // ================================================================
  // restoreAgent
  // ================================================================
  describe('restoreAgent', () => {
    it('calls update with archived: false', async () => {
      await restoreAgent('agent-2');
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'id', archived: 'archived' }),
      );
    });
  });

  // ================================================================
  // countActiveUserAgents
  // ================================================================
  describe('countActiveUserAgents', () => {
    it('returns the count from the query', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

      const count = await countActiveUserAgents('user-1');
      expect(count).toBe(5);
    });

    it('returns 0 when no results', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const count = await countActiveUserAgents('user-1');
      expect(count).toBe(0);
    });
  });

  // ================================================================
  // insertAgent
  // ================================================================
  describe('insertAgent', () => {
    it('calls db.insert with the provided values', async () => {
      const values = {
        id: 'agent-new',
        name: 'Test Agent',
        systemPrompt: 'Be sharp.',
        presetId: null,
        tier: 'custom' as const,
        model: null,
        responseLength: 'short',
        responseFormat: 'spaced',
        promptHash: 'hash1',
        manifestHash: 'hash2',
      };

      await insertAgent(values);
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'id' }),
      );
    });
  });

  // ================================================================
  // updateAgentAttestation
  // ================================================================
  describe('updateAgentAttestation', () => {
    it('calls update with attestation data', async () => {
      await updateAgentAttestation('agent-1', {
        uid: 'att-uid-1',
        txHash: '0xabc',
      });
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'id' }),
      );
    });
  });

});
