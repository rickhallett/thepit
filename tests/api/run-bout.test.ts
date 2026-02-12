import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, authMock } = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  const authFn = vi.fn();
  return { mockDb: db, authMock: authFn };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

import { POST } from '@/app/api/run-bout/route';

describe('run-bout api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: null });
    // Default: no existing bout
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }));
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/run-bout', {
      method: 'POST',
      body: '{bad',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing boutId', async () => {
    const req = new Request('http://localhost/api/run-bout', {
      method: 'POST',
      body: JSON.stringify({ presetId: 'darwin-special' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 409 when bout is already running with transcript', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{
            status: 'running',
            presetId: 'darwin-special',
            transcript: [{ agentId: 'a1', text: 'hello', turn: 0 }],
          }],
        }),
      }),
    }));

    const req = new Request('http://localhost/api/run-bout', {
      method: 'POST',
      body: JSON.stringify({ boutId: 'bout-123', presetId: 'darwin-special' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'Bout is already running.' });
  });

  it('allows running bout with empty transcript (normal flow)', async () => {
    // This is the normal flow: createBout inserts status='running' with
    // empty transcript, then /api/run-bout starts streaming. We should NOT
    // block this.
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{
            status: 'running',
            presetId: 'darwin-special',
            transcript: [],
          }],
        }),
      }),
    }));

    const req = new Request('http://localhost/api/run-bout', {
      method: 'POST',
      body: JSON.stringify({ boutId: 'bout-normal', presetId: 'darwin-special' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    // Should NOT be 409 — it should proceed past the idempotency check.
    // It may fail later (no auth, no model, etc.) but that's fine.
    expect(res.status).not.toBe(409);
  });

  it('returns 409 when bout has already completed', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{
            status: 'completed',
            presetId: 'darwin-special',
            transcript: [{ agentId: 'a1', text: 'hello', turn: 0 }],
          }],
        }),
      }),
    }));

    const req = new Request('http://localhost/api/run-bout', {
      method: 'POST',
      body: JSON.stringify({ boutId: 'bout-456', presetId: 'darwin-special' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'Bout has already completed.' });
  });
});
