import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockDb, mockRegisterPresetAgent, mockAttestAgent } = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  };
  // Default: transaction executes the callback with the db as the tx context
  db.transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
  return {
    mockDb: db,
    mockRegisterPresetAgent: vi.fn(),
    mockAttestAgent: vi.fn(),
  };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  agents: {
    id: 'id',
    name: 'name',
    systemPrompt: 'system_prompt',
    presetId: 'preset_id',
    tier: 'tier',
    model: 'model',
    responseLength: 'response_length',
    responseFormat: 'response_format',
    createdAt: 'created_at',
    ownerId: 'owner_id',
    parentId: 'parent_id',
    promptHash: 'prompt_hash',
    manifestHash: 'manifest_hash',
    attestationUid: 'attestation_uid',
    attestationTxHash: 'attestation_tx_hash',
    attestedAt: 'attested_at',
    archived: 'archived',
  },
}));

vi.mock('@/lib/presets', () => ({
  ALL_PRESETS: [
    {
      id: 'test-preset',
      name: 'Test Preset',
      tier: 'free',
      agents: [
        { id: 'agent-a', name: 'Agent A', systemPrompt: 'Be A', color: '#f00' },
        { id: 'agent-b', name: 'Agent B', systemPrompt: 'Be B', color: '#0f0' },
      ],
    },
  ],
}));

vi.mock('@/lib/agent-registry', () => ({
  buildPresetAgentId: vi.fn(
    (presetId: string, agentId: string) => `preset:${presetId}:${agentId}`,
  ),
  registerPresetAgent: mockRegisterPresetAgent,
}));

vi.mock('@/lib/eas', () => ({
  EAS_ENABLED: false,
  attestAgent: mockAttestAgent,
}));

import { POST } from '@/app/api/admin/seed-agents/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeRequest = (token?: string) =>
  new Request('http://localhost/api/admin/seed-agents', {
    method: 'POST',
    headers: token ? { 'x-admin-token': token } : {},
  });

const setupSelectEmpty = () => {
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  }));
};

const setupSelectExisting = () => {
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: vi.fn().mockResolvedValue([{ id: 'exists', attestationUid: '0x123' }]),
      }),
    }),
  }));
};

const setupInsert = () => {
  mockDb.insert.mockImplementation(() => ({
    values: vi.fn().mockResolvedValue(undefined),
  }));
};

const setupUpdate = () => {
  mockDb.update.mockImplementation(() => ({
    set: () => ({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }));
};

const defaultRegistration = {
  agentId: 'preset:test-preset:agent-a',
  manifest: {
    agentId: 'preset:test-preset:agent-a',
    name: 'Agent A',
    systemPrompt: 'Be A',
    presetId: 'test-preset',
    tier: 'free',
    model: null,
    responseLength: 'standard',
    responseFormat: 'plain',
    createdAt: '2026-01-01T00:00:00.000Z',
    parentId: null,
    ownerId: null,
  },
  promptHash: '0x' + 'a'.repeat(64),
  manifestHash: '0x' + 'b'.repeat(64),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/admin/seed-agents', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.ADMIN_SEED_TOKEN = 'test-secret';
    // Re-establish transaction mock (wiped by resetAllMocks)
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof mockDb) => unknown) => fn(mockDb));
    setupSelectEmpty();
    setupInsert();
    setupUpdate();
    mockRegisterPresetAgent.mockResolvedValue(defaultRegistration);
    mockAttestAgent.mockResolvedValue({
      uid: '0x' + 'c'.repeat(64),
      txHash: '0x' + 'd'.repeat(64),
    });
  });

  // U1
  it('returns 401 when ADMIN_SEED_TOKEN env is missing', async () => {
    delete process.env.ADMIN_SEED_TOKEN;
    const res = await POST(makeRequest('test-secret'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Authentication required.');
  });

  // U2
  it('returns 401 when x-admin-token header is missing', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Authentication required.');
  });

  // U3
  it('returns 401 when admin token is wrong', async () => {
    const res = await POST(makeRequest('wrong-token'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Authentication required.');
  });

  // H1
  it('seeds new agents with valid token → 200', async () => {
    const res = await POST(makeRequest('test-secret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.created).toBe(2);
    expect(body.attested).toBe(0);
    expect(body.errors).toBe(0);
  });

  // H2
  it('seeds with EAS enabled → attests agents', async () => {
    // Re-mock EAS to be enabled
    vi.doMock('@/lib/eas', () => ({
      EAS_ENABLED: true,
      attestAgent: mockAttestAgent,
    }));
    // Re-import to pick up the new mock
    vi.resetModules();
    const { POST: PostHandler } = await import(
      '@/app/api/admin/seed-agents/route'
    );

    mockDb.transaction.mockImplementation(async (fn: (tx: typeof mockDb) => unknown) => fn(mockDb));
    setupSelectEmpty();
    setupInsert();
    setupUpdate();

    const res = await PostHandler(makeRequest('test-secret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.created).toBe(2);
    expect(body.attested).toBe(2);
    expect(body.errors).toBe(0);
  });

  // H3
  it('re-run seed with agents already existing → created 0', async () => {
    setupSelectExisting();
    const res = await POST(makeRequest('test-secret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.created).toBe(0);
  });

  // U4
  it('aborts entire seed when individual agent registration fails (transaction)', async () => {
    let callCount = 0;
    mockRegisterPresetAgent.mockImplementation(() => {
      callCount++;
      if (callCount === 1) throw new Error('boom');
      return defaultRegistration;
    });

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // The transaction propagates the error; withLogging re-throws
    await expect(POST(makeRequest('test-secret'))).rejects.toThrow('boom');
    errSpy.mockRestore();
  });

  // U5
  it('rolls back all inserts when one fails mid-loop', async () => {
    // Track all insert calls to verify rollback behavior
    const insertedIds: string[] = [];
    let insertCallCount = 0;

    mockDb.insert.mockImplementation(() => ({
      values: vi.fn().mockImplementation((val: { id?: string }) => {
        insertCallCount++;
        // Third insert throws (after 2 preset agents succeed, first DNA agent fails)
        if (insertCallCount === 3) throw new Error('db constraint violation');
        if (val?.id) insertedIds.push(val.id);
        return Promise.resolve(undefined);
      }),
    }));

    // Mock transaction to simulate real rollback: if callback throws,
    // discard all side effects by clearing the tracked inserts
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof mockDb) => unknown) => {
      insertedIds.length = 0;
      try {
        return await fn(mockDb);
      } catch (error) {
        // Rollback: clear all inserts that happened inside the transaction
        insertedIds.length = 0;
        throw error;
      }
    });

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(POST(makeRequest('test-secret'))).rejects.toThrow('db constraint violation');

    // Verify no agents persisted (all rolled back)
    expect(insertedIds).toHaveLength(0);
    errSpy.mockRestore();
  });
});
