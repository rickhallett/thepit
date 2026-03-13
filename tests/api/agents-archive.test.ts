import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockDb, authMock } = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    update: vi.fn(),
  };
  return {
    mockDb: db,
    authMock: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/db', () => ({ requireDb: () => mockDb }));

vi.mock('@/db/schema', () => ({
  agents: {
    id: 'id',
    ownerId: 'owner_id',
    archived: 'archived',
  },
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }));

// ---------------------------------------------------------------------------
// SUT
// ---------------------------------------------------------------------------

import { PATCH } from '@/app/api/agents/[id]/archive/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makePatchRequest = (agentId: string) =>
  new Request(`http://localhost/api/agents/${agentId}/archive`, {
    method: 'PATCH',
  });

const makeRouteParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks();
  authMock.mockResolvedValue({ userId: 'user-1' });
});

// ---------------------------------------------------------------------------
// Happy paths
// ---------------------------------------------------------------------------

describe('PATCH /api/agents/[id]/archive - happy paths', () => {
  it('archives an unarchived agent (toggles to true)', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 'agent-123', ownerId: 'user-1', archived: false }],
        }),
      }),
    }));

    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: async () => ({}),
      }),
    }));

    const res = await PATCH(makePatchRequest('agent-123'), makeRouteParams('agent-123'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: 'agent-123', archived: true });
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('unarchives an archived agent (toggles to false)', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 'agent-456', ownerId: 'user-1', archived: true }],
        }),
      }),
    }));

    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: async () => ({}),
      }),
    }));

    const res = await PATCH(makePatchRequest('agent-456'), makeRouteParams('agent-456'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: 'agent-456', archived: false });
  });
});

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe('PATCH /api/agents/[id]/archive - error cases', () => {
  it('returns 401 when not authenticated', async () => {
    authMock.mockResolvedValue({ userId: null });

    const res = await PATCH(makePatchRequest('agent-123'), makeRouteParams('agent-123'));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('returns 404 when agent does not exist', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }));

    const res = await PATCH(makePatchRequest('nonexistent'), makeRouteParams('nonexistent'));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found.' });
  });

  it('returns 403 when user does not own the agent', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 'agent-123', ownerId: 'other-user', archived: false }],
        }),
      }),
    }));

    const res = await PATCH(makePatchRequest('agent-123'), makeRouteParams('agent-123'));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden.' });
  });
});
