import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock cookie jar
const { cookieStore } = vi.hoisted(() => {
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
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}));

import { POST, readAndClearByokKey } from '@/app/api/byok-stash/route';

describe('byok-stash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore._store.clear();
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

  it('POST sets cookie and returns { ok: true }', async () => {
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: 'sk-test-123' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(cookieStore.set).toHaveBeenCalledWith(
      'pit_byok',
      'sk-test-123',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('readAndClearByokKey returns key and deletes cookie', () => {
    cookieStore._store.set('pit_byok', { name: 'pit_byok', value: 'sk-test-456' });
    const key = readAndClearByokKey(cookieStore as never);
    expect(key).toBe('sk-test-456');
    expect(cookieStore.delete).toHaveBeenCalledWith('pit_byok');
  });

  it('readAndClearByokKey returns null when no cookie', () => {
    const key = readAndClearByokKey(cookieStore as never);
    expect(key).toBeNull();
  });
});
