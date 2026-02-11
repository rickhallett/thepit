import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock rate-limit
const { checkRateLimitMock, getClientIdentifierMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  getClientIdentifierMock: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIdentifier: getClientIdentifierMock,
}));

// Mock DB
const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

vi.mock('@/db', () => ({
  requireDb: () => ({ insert: mockInsert }),
}));

vi.mock('@/db/schema', () => ({
  newsletterSignups: {},
}));

import { POST } from '@/app/api/newsletter/route';

describe('newsletter api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientIdentifierMock.mockReturnValue('127.0.0.1');
    checkRateLimitMock.mockReturnValue({
      success: true,
      remaining: 4,
      resetAt: Date.now() + 3600000,
    });
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/newsletter', {
      method: 'POST',
      body: '{bad',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing email', async () => {
    const req = new Request('http://localhost/api/newsletter', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email format', async () => {
    const req = new Request('http://localhost/api/newsletter', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns { ok: true } for valid email', async () => {
    const req = new Request('http://localhost/api/newsletter', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
