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

vi.mock('@/lib/model-registry', () => ({
  isValidModelId: vi.fn((id: string) =>
    ['openai/gpt-4o', 'openai/gpt-4o-mini', 'anthropic/claude-haiku-4'].includes(id),
  ),
}));

import { POST } from '@/app/api/byok-stash/route';
import { encodeByokCookie, decodeByokCookie, readAndClearByokKey } from '@/lib/byok';

describe('encodeByokCookie / decodeByokCookie', () => {
  it('encodes model + key and round-trips', () => {
    const encoded = encodeByokCookie('sk-or-v1-abc', 'openai/gpt-4o');
    expect(encoded).toBe('openai/gpt-4o:||:sk-or-v1-abc');
    const decoded = decodeByokCookie(encoded);
    expect(decoded).toEqual({ modelId: 'openai/gpt-4o', key: 'sk-or-v1-abc' });
  });

  it('encodes key only (no model) and round-trips', () => {
    const encoded = encodeByokCookie('sk-or-v1-xyz');
    expect(encoded).toBe(':||:sk-or-v1-xyz');
    const decoded = decodeByokCookie(encoded);
    expect(decoded).toEqual({ modelId: undefined, key: 'sk-or-v1-xyz' });
  });

  it('decodes legacy format (raw key, no separator)', () => {
    const decoded = decodeByokCookie('sk-or-v1-legacy-key');
    expect(decoded).toEqual({ modelId: undefined, key: 'sk-or-v1-legacy-key' });
  });
});

describe('readAndClearByokKey', () => {
  beforeEach(() => {
    cookieStore._store.clear();
    vi.clearAllMocks();
  });

  it('reads and deletes cookie, returning decoded value', () => {
    cookieStore._store.set('pit_byok', {
      name: 'pit_byok',
      value: 'openai/gpt-4o:||:sk-or-v1-test-456',
    });
    const result = readAndClearByokKey(cookieStore as never);
    expect(result).toEqual({ modelId: 'openai/gpt-4o', key: 'sk-or-v1-test-456' });
    expect(cookieStore.delete).toHaveBeenCalledWith('pit_byok');
  });

  it('handles legacy raw key format', () => {
    cookieStore._store.set('pit_byok', {
      name: 'pit_byok',
      value: 'sk-or-v1-legacy-key-789',
    });
    const result = readAndClearByokKey(cookieStore as never);
    expect(result).toEqual({ modelId: undefined, key: 'sk-or-v1-legacy-key-789' });
    expect(cookieStore.delete).toHaveBeenCalledWith('pit_byok');
  });

  it('returns null when no cookie present', () => {
    const result = readAndClearByokKey(cookieStore as never);
    expect(result).toBeNull();
  });
});

describe('byok-stash route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    cookieStore._store.clear();
    authMock.mockResolvedValue({ userId: 'user_test' });
  });

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue({ userId: null });
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: 'sk-or-v1-test-123' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Authentication required.');
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: '{bad',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON.');
  });

  it('returns 400 when key is missing/empty', async () => {
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing key.');
  });

  it('returns 400 for Anthropic key with message referencing OpenRouter', async () => {
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: 'sk-ant-test-123' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('OpenRouter');
    expect(body.error).toContain('Invalid key format');
  });

  it('returns 400 for an unrecognized key prefix', async () => {
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

  it('accepts OpenRouter key, sets cookie, returns { ok: true }', async () => {
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: 'sk-or-v1-test-456', model: 'openai/gpt-4o' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
    expect(json.provider).toBeUndefined();
    expect(cookieStore.set).toHaveBeenCalledWith(
      'pit_byok',
      'openai/gpt-4o:||:sk-or-v1-test-456',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('accepts OpenRouter key without model', async () => {
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: 'sk-or-v1-no-model' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
    expect(cookieStore.set).toHaveBeenCalledWith(
      'pit_byok',
      ':||:sk-or-v1-no-model',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('returns 400 for unknown model ID', async () => {
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: 'sk-or-v1-test-456', model: 'unknown/bad-model' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Unsupported model.');
  });
});
