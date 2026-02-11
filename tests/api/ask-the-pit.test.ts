import { describe, expect, it, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Hoisted mocks                                                       */
/* ------------------------------------------------------------------ */

const {
  checkRateLimitMock,
  getClientIdentifierMock,
  streamTextMock,
  getModelMock,
  readFileSyncMock,
  pitConfig,
} = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  getClientIdentifierMock: vi.fn(),
  streamTextMock: vi.fn(),
  getModelMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  pitConfig: {
    ASK_THE_PIT_ENABLED: true,
    ASK_THE_PIT_DOCS: ['README.md'],
    ASK_THE_PIT_MODEL: 'claude-haiku-4-5-20251001',
    ASK_THE_PIT_MAX_TOKENS: 2000,
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIdentifier: getClientIdentifierMock,
}));

vi.mock('@/lib/ask-the-pit-config', () => pitConfig);

vi.mock('ai', () => ({
  streamText: streamTextMock,
}));

vi.mock('@/lib/ai', () => ({
  getModel: getModelMock,
  FREE_MODEL_ID: 'claude-haiku-4-5-20251001',
}));

vi.mock('node:fs', () => ({
  readFileSync: readFileSyncMock,
}));

/* ------------------------------------------------------------------ */

import { POST } from '@/app/api/ask-the-pit/route';

describe('ask-the-pit route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientIdentifierMock.mockReturnValue('127.0.0.1');
    checkRateLimitMock.mockReturnValue({
      success: true,
      remaining: 4,
      resetAt: Date.now() + 60_000,
    });

    // Reset feature flag to enabled
    pitConfig.ASK_THE_PIT_ENABLED = true;

    readFileSyncMock.mockReturnValue('test documentation content');
    getModelMock.mockReturnValue({ modelId: 'claude-haiku-4-5-20251001' });
    streamTextMock.mockReturnValue({
      toTextStreamResponse: () =>
        new Response('streamed text', { status: 200 }),
    });
  });

  function makeReq(body: string) {
    return new Request('http://localhost/api/ask-the-pit', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  function makeJsonReq(body: unknown) {
    return makeReq(JSON.stringify(body));
  }

  it('U1: feature disabled → 404 "Ask The Pit is not enabled."', async () => {
    pitConfig.ASK_THE_PIT_ENABLED = false;

    const res = await POST(makeJsonReq({ message: 'hello' }));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Ask The Pit is not enabled.' });
  });

  it('U2: missing message → 400 "Missing message."', async () => {
    const res = await POST(makeJsonReq({}));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing message.' });
  });

  it('U3: empty message (whitespace) → 400 "Missing message."', async () => {
    const res = await POST(makeJsonReq({ message: '   ' }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing message.' });
  });

  it('U4: invalid JSON → 400 "Invalid JSON."', async () => {
    const res = await POST(makeReq('{bad'));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON.' });
  });

  it('U5: rate limit → 429', async () => {
    checkRateLimitMock.mockReturnValue({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });

    const res = await POST(makeJsonReq({ message: 'hello' }));

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('Rate limit exceeded');
  });

  it('H1: valid message with feature enabled → 200 streaming response', async () => {
    const res = await POST(makeJsonReq({ message: 'What is The Pit?' }));

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('streamed text');

    // Verify streamText was called with expected shape
    expect(streamTextMock).toHaveBeenCalledTimes(1);
    const callArgs = streamTextMock.mock.calls[0][0];
    expect(callArgs.maxOutputTokens).toBe(2000);
    expect(callArgs.messages).toEqual([
      { role: 'system', content: expect.stringContaining('documentation') },
      { role: 'user', content: 'What is The Pit?' },
    ]);

    // Verify getModel was called with the configured model
    expect(getModelMock).toHaveBeenCalledWith('claude-haiku-4-5-20251001');
  });
});
