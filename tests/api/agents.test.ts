import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

import { POST } from '@/app/api/agents/route';

describe('agents api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: unauthenticated
    authMock.mockResolvedValue({ userId: null });
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/agents', {
      method: 'POST',
      body: '{bad',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing name', async () => {
    const req = new Request('http://localhost/api/agents', {
      method: 'POST',
      body: JSON.stringify({ systemPrompt: 'Be sharp.' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing prompt', async () => {
    const req = new Request('http://localhost/api/agents', {
      method: 'POST',
      body: JSON.stringify({ name: 'NoPrompt' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 when not authenticated', async () => {
    authMock.mockResolvedValue({ userId: null });
    const req = new Request('http://localhost/api/agents', {
      method: 'POST',
      body: JSON.stringify({ name: 'TestAgent', systemPrompt: 'Be helpful.' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});
