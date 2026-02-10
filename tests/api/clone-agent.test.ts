import { describe, expect, it, vi, beforeEach } from 'vitest';

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

// Mock DB
const mockValuesCall = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockValuesCall });
const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
});
vi.mock('@/db', () => ({
  requireDb: () => ({ insert: mockInsert, update: mockUpdate }),
}));

// Mock EAS
vi.mock('@/lib/eas', () => ({
  EAS_ENABLED: false,
  attestAgent: vi.fn(),
}));

// Mock users
vi.mock('@/lib/users', () => ({
  ensureUserRecord: vi.fn(),
}));

import { POST } from '@/app/api/agents/route';

describe('POST /api/agents (clone flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: null });
  });

  it('accepts parentId to establish lineage', async () => {
    authMock.mockResolvedValue({ userId: 'user_clone_test' });

    const body = {
      name: 'Clone of Darwin',
      archetype: 'Evolutionary biologist',
      tone: 'Sardonic',
      quirks: ['uses Latin names'],
      goal: 'Prove natural selection',
      parentId: 'preset:darwin-special:darwin',
    };

    const req = new Request('http://localhost/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.agentId).toBeDefined();
    expect(json.promptHash).toBeDefined();
    expect(json.manifestHash).toBeDefined();

    // Verify parentId was included in the DB insert
    const insertedValues = mockValuesCall.mock.calls[0]?.[0];
    expect(insertedValues?.parentId).toBe('preset:darwin-special:darwin');
  });

  it('requires auth for clone just like creation', async () => {
    authMock.mockResolvedValue({ userId: null });

    const req = new Request('http://localhost/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unauthorized Clone',
        archetype: 'Test',
        parentId: 'some-agent-id',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('creates agent without parentId for fresh builds', async () => {
    authMock.mockResolvedValue({ userId: 'user_fresh' });

    const req = new Request('http://localhost/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Fresh Agent',
        archetype: 'Original',
        tone: 'Calm',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.agentId).toBeDefined();

    // parentId should be null for non-cloned agents
    const insertedValues = mockValuesCall.mock.calls[0]?.[0];
    expect(insertedValues?.parentId).toBeNull();
  });
});
