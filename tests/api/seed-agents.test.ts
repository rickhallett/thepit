import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockDb, mockRegisterPresetAgent, mockAttestAgent } = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
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
    vi.clearAllMocks();
    process.env.ADMIN_SEED_TOKEN = 'test-secret';
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
  });

  // U2
  it('returns 401 when x-admin-token header is missing', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  // U3
  it('returns 401 when admin token is wrong', async () => {
    const res = await POST(makeRequest('wrong-token'));
    expect(res.status).toBe(401);
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
  it('counts errors when individual agent seed fails', async () => {
    let callCount = 0;
    mockRegisterPresetAgent.mockImplementation(() => {
      callCount++;
      if (callCount === 1) throw new Error('boom');
      return defaultRegistration;
    });

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await POST(makeRequest('test-secret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.errors).toBe(1);
    expect(body.created).toBe(1);
    errSpy.mockRestore();
  });
});
