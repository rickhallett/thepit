import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Hoisted mocks                                                       */
/* ------------------------------------------------------------------ */

const { checkRateLimitMock, getClientIdentifierMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  getClientIdentifierMock: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIdentifier: getClientIdentifierMock,
}));

/* ------------------------------------------------------------------ */

import { POST } from '@/app/api/contact/route';

describe('contact form', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    getClientIdentifierMock.mockReturnValue('127.0.0.1');
    checkRateLimitMock.mockReturnValue({
      success: true,
      remaining: 4,
      resetAt: Date.now() + 3_600_000,
    });

    // Set required env vars by default
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.CONTACT_TO_EMAIL = 'admin@thepit.ai';

    // Mock global fetch for Resend API
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'email_123' }), { status: 200 }),
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    // Restore env
    process.env.RESEND_API_KEY = originalEnv.RESEND_API_KEY;
    process.env.CONTACT_TO_EMAIL = originalEnv.CONTACT_TO_EMAIL;
    process.env.CONTACT_FROM_EMAIL = originalEnv.CONTACT_FROM_EMAIL;
  });

  function makeReq(body: string) {
    return new Request('http://localhost/api/contact', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  function makeJsonReq(body: unknown) {
    return makeReq(JSON.stringify(body));
  }

  it('H1: valid submission → 200 { ok: true }, fetch called with escaped HTML', async () => {
    const res = await POST(
      makeJsonReq({ name: 'Alice', email: 'alice@example.com', message: 'Hello!' }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    // Verify fetch was called to Resend API
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(opts.method).toBe('POST');
    expect(opts.headers.Authorization).toBe('Bearer test-resend-key');

    const body = JSON.parse(opts.body);
    expect(body.to).toEqual(['admin@thepit.ai']);
    expect(body.subject).toContain('Alice');
    expect(body.html).toContain('Alice');
  });

  it('U1: missing name → 400 "Missing fields."', async () => {
    const res = await POST(
      makeJsonReq({ email: 'a@b.com', message: 'hi' }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing fields.' });
  });

  it('U2: missing email → 400 "Missing fields."', async () => {
    const res = await POST(
      makeJsonReq({ name: 'Alice', message: 'hi' }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing fields.' });
  });

  it('U3: missing message → 400 "Missing fields."', async () => {
    const res = await POST(
      makeJsonReq({ name: 'Alice', email: 'a@b.com' }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing fields.' });
  });

  it('U4: invalid JSON → 400 "Invalid JSON."', async () => {
    const res = await POST(makeReq('{bad'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON.' });
  });

  it('U5: RESEND_API_KEY not set → 501 "Contact email not configured."', async () => {
    delete process.env.RESEND_API_KEY;

    const res = await POST(
      makeJsonReq({ name: 'Alice', email: 'a@b.com', message: 'hi' }),
    );
    expect(res.status).toBe(501);
    expect(await res.json()).toEqual({ error: 'Contact email not configured.' });
  });

  it('U6: CONTACT_TO_EMAIL not set → 501 "Contact email not configured."', async () => {
    delete process.env.CONTACT_TO_EMAIL;

    const res = await POST(
      makeJsonReq({ name: 'Alice', email: 'a@b.com', message: 'hi' }),
    );
    expect(res.status).toBe(501);
    expect(await res.json()).toEqual({ error: 'Contact email not configured.' });
  });

  it('U7: Resend API returns 500 → 500 "Email delivery failed."', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );

    const res = await POST(
      makeJsonReq({ name: 'Alice', email: 'a@b.com', message: 'hi' }),
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Email delivery failed.' });
  });

  it('U8: rate limit exceeded → 429', async () => {
    checkRateLimitMock.mockReturnValue({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 3_600_000,
    });

    const res = await POST(
      makeJsonReq({ name: 'Alice', email: 'a@b.com', message: 'hi' }),
    );
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: 'Rate limit exceeded.', code: 'RATE_LIMITED' });
  });

  it('U9: HTML special chars in fields are escaped in email body', async () => {
    const res = await POST(
      makeJsonReq({
        name: '<script>alert("xss")</script>',
        email: 'xss@"evil".com',
        message: 'Hello & <b>goodbye</b>',
      }),
    );

    expect(res.status).toBe(200);

    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(opts.body);

    // Name should be escaped in html body
    expect(body.html).toContain('&lt;script&gt;');
    expect(body.html).not.toContain('<script>');

    // Message should be escaped
    expect(body.html).toContain('&amp;');
    expect(body.html).toContain('&lt;b&gt;');

    // Email should be escaped
    expect(body.html).toContain('&quot;evil&quot;');
  });
});
