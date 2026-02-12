/**
 * S-06: Contact form validation
 * Ensures email format, name length, and message length are validated.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { checkRateLimitMock, getClientIdentifierMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  getClientIdentifierMock: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIdentifier: getClientIdentifierMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  getClientIdentifierMock.mockReturnValue('127.0.0.1');
  checkRateLimitMock.mockReturnValue({
    success: true,
    remaining: 4,
    resetAt: Date.now() + 3600000,
  });
  process.env.RESEND_API_KEY = 'test';
  process.env.CONTACT_TO_EMAIL = 'test@test.com';
});

function makeReq(body: unknown) {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('contact form validation', () => {
  it('rejects invalid email format', async () => {
    const { POST } = await import('@/app/api/contact/route');
    const res = await POST(makeReq({ name: 'Test', email: 'not-an-email', message: 'Hello' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid email address.' });
  });

  it('rejects name exceeding 200 characters', async () => {
    const { POST } = await import('@/app/api/contact/route');
    const res = await POST(
      makeReq({ name: 'A'.repeat(201), email: 'test@test.com', message: 'Hello' }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Input too long.' });
  });

  it('rejects message exceeding 5000 characters', async () => {
    const { POST } = await import('@/app/api/contact/route');
    const res = await POST(
      makeReq({ name: 'Test', email: 'test@test.com', message: 'X'.repeat(5001) }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Input too long.' });
  });
});
