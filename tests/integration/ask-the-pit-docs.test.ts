// Integration tests for Ask The Pit document loading, path traversal guard,
// and sensitive section stripping.

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
  MODELS,
} = vi.hoisted(() => {
  const MODELS = {
    HAIKU: 'claude-haiku-4-5-20251001',
    SONNET_45: 'claude-sonnet-4-5-20250929',
    SONNET_46: 'claude-sonnet-4-6',
  } as const;
  return {
    checkRateLimitMock: vi.fn(),
    getClientIdentifierMock: vi.fn(),
    streamTextMock: vi.fn(),
    getModelMock: vi.fn(),
    readFileSyncMock: vi.fn(),
    pitConfig: {
      ASK_THE_PIT_ENABLED: true,
      ASK_THE_PIT_DOCS: ['docs/public/ask-the-pit-knowledge.md'],
      ASK_THE_PIT_MODEL: MODELS.HAIKU,
      ASK_THE_PIT_MAX_TOKENS: 2000,
    },
    MODELS,
  };
});

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
  FREE_MODEL_ID: MODELS.HAIKU,
}));

vi.mock('node:fs', () => ({
  readFileSync: readFileSyncMock,
}));

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function makeJsonReq(body: unknown) {
  return new Request('http://localhost/api/ask-the-pit', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Extract the system prompt content from the streamText mock call. */
function getSystemContent(): string {
  expect(streamTextMock).toHaveBeenCalledTimes(1);
  const callArgs = streamTextMock.mock.calls[0]![0];
  const systemMsg = callArgs.messages.find(
    (m: { role: string }) => m.role === 'system',
  );
  expect(systemMsg).toBeDefined();
  return systemMsg.content as string;
}

function setupDefaultMocks() {
  vi.resetAllMocks();
  getClientIdentifierMock.mockReturnValue('127.0.0.1');
  checkRateLimitMock.mockReturnValue({
    success: true,
    remaining: 4,
    resetAt: Date.now() + 60_000,
  });
  pitConfig.ASK_THE_PIT_ENABLED = true;
  pitConfig.ASK_THE_PIT_DOCS = ['docs/public/ask-the-pit-knowledge.md'];
  getModelMock.mockReturnValue({ modelId: MODELS.HAIKU });
  streamTextMock.mockReturnValue({
    toTextStreamResponse: () =>
      new Response('streamed text', { status: 200 }),
  });
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe('ask-the-pit document loading integration', () => {
  beforeEach(() => {
    setupDefaultMocks();
  });

  it('IT1: curated doc loads and is included in system prompt', async () => {
    vi.resetModules();

    readFileSyncMock.mockReturnValue(
      '# The Pit\n\nA multi-agent AI debate arena. Create AI agents with distinct personalities.',
    );

    const { POST } = await import('@/app/api/ask-the-pit/route');
    const res = await POST(makeJsonReq({ message: 'What is The Pit?' }));

    expect(res.status).toBe(200);

    const systemContent = getSystemContent();
    expect(systemContent).toContain('multi-agent AI debate arena');
  });

  it('IT2: path traversal returns 503', async () => {
    vi.resetModules();

    pitConfig.ASK_THE_PIT_DOCS = ['../../etc/passwd'];
    readFileSyncMock.mockReturnValue('should not appear');

    const { POST } = await import('@/app/api/ask-the-pit/route');
    const res = await POST(makeJsonReq({ message: 'hello' }));

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('Service unavailable.');
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it('IT3: sensitive section stripping', async () => {
    vi.resetModules();

    readFileSyncMock.mockReturnValue(
      '# The Pit\n\nA multi-agent AI debate arena.\n\n## Environment\nSECRET_KEY=abc123\nDB_URL=postgres://\n\n## Features\n\nReal-time streaming debates.',
    );

    const { POST } = await import('@/app/api/ask-the-pit/route');
    const res = await POST(makeJsonReq({ message: 'Tell me about The Pit' }));

    expect(res.status).toBe(200);

    const systemContent = getSystemContent();
    expect(systemContent).not.toContain('SECRET_KEY');
    expect(systemContent).not.toContain('DB_URL');
    expect(systemContent).toContain('multi-agent AI debate arena');
    expect(systemContent).toContain('Real-time streaming debates');
  });

  it('IT4: missing doc returns 503', async () => {
    vi.resetModules();

    readFileSyncMock.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });

    const { POST } = await import('@/app/api/ask-the-pit/route');
    const res = await POST(makeJsonReq({ message: 'hello' }));

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('Service unavailable.');
    expect(streamTextMock).not.toHaveBeenCalled();
  });
});
