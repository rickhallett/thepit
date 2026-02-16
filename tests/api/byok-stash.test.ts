import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock cookie jar and auth
const { cookieStore, authMock } = vi.hoisted(() => {
  const store = new Map<string, { name: string; value: string }>();
  return {
    cookieStore: {
      _store: store,
      get: vi.fn((name: string) => store.get(name) ?? undefined),
      set: vi.fn((name: string, value: string, _opts?: unknown) => {
        store.set(name, { name, value });
      }),
      delete: vi.fn((name: string) => {
        store.delete(name);
      }),
    },
    authMock: vi.fn(),
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

import { POST, readAndClearByokKey } from '@/app/api/byok-stash/route';

describe('byok-stash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore._store.clear();
    authMock.mockResolvedValue({ userId: 'user_test' });
  });

  it('POST returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: '{bad',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('POST returns 400 when key is missing/empty', async () => {
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('POST returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue({ userId: null });
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: 'sk-ant-test-123' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('POST returns 400 for invalid key format', async () => {
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: 'invalid-prefix-key' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid key format');
  });

  it('POST sets cookie and returns { ok: true } for Anthropic key', async () => {
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: 'sk-ant-test-123' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.provider).toBe('anthropic');
    // Cookie value is now encoded: provider:||:model:||:key
    expect(cookieStore.set).toHaveBeenCalledWith(
      'pit_byok',
      'anthropic:||::||:sk-ant-test-123',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('POST sets cookie and returns { ok: true } for OpenRouter key', async () => {
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: 'sk-or-v1-test-456', model: 'openai/gpt-4o' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.provider).toBe('openrouter');
    expect(cookieStore.set).toHaveBeenCalledWith(
      'pit_byok',
      'openrouter:||:openai/gpt-4o:||:sk-or-v1-test-456',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('POST returns 400 for unsupported Anthropic model', async () => {
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: 'sk-ant-test-123', model: 'openai/gpt-4o' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Unsupported Anthropic model');
  });

  it('POST returns 400 for unsupported OpenRouter model', async () => {
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: 'sk-or-v1-test-456', model: 'unknown/bad-model' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Unsupported OpenRouter model');
  });

  it('readAndClearByokKey decodes encoded cookie (new format)', () => {
    cookieStore._store.set('pit_byok', {
      name: 'pit_byok',
      value: 'openrouter:||:openai/gpt-4o:||:sk-or-v1-test-456',
    });
    const result = readAndClearByokKey(cookieStore as never);
    expect(result).toEqual({
      provider: 'openrouter',
      modelId: 'openai/gpt-4o',
      key: 'sk-or-v1-test-456',
    });
    expect(cookieStore.delete).toHaveBeenCalledWith('pit_byok');
  });

  it('readAndClearByokKey handles legacy format (raw Anthropic key)', () => {
    cookieStore._store.set('pit_byok', {
      name: 'pit_byok',
      value: 'sk-ant-legacy-key-789',
    });
    const result = readAndClearByokKey(cookieStore as never);
    expect(result).toEqual({
      provider: 'anthropic',
      modelId: undefined,
      key: 'sk-ant-legacy-key-789',
    });
    expect(cookieStore.delete).toHaveBeenCalledWith('pit_byok');
  });

  it('readAndClearByokKey returns null when no cookie', () => {
    const result = readAndClearByokKey(cookieStore as never);
    expect(result).toBeNull();
  });
});
