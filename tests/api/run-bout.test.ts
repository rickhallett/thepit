import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return { mockDb: db };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

import { POST } from '@/app/api/run-bout/route';

describe('run-bout api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('returns 409 when bout is already running', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ status: 'running', presetId: 'darwin-special' }],
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
    expect(await res.text()).toBe('Bout is already running.');
  });

  it('returns 409 when bout has already completed', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ status: 'completed', presetId: 'darwin-special' }],
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
    expect(await res.text()).toBe('Bout has already completed.');
  });
});
