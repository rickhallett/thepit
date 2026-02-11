import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ───────────────────────────────────────────────────

const {
  authMock,
  getUserTierMock,
  validateBoutRequestMock,
  executeBoutMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getUserTierMock: vi.fn(),
  validateBoutRequestMock: vi.fn(),
  executeBoutMock: vi.fn(),
}));

// ─── Module mocks ────────────────────────────────────────────────────

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/lib/tier', () => ({
  SUBSCRIPTIONS_ENABLED: true,
  getUserTier: getUserTierMock,
  TIER_CONFIG: {
    free: { apiAccess: false },
    pass: { apiAccess: false },
    lab: { apiAccess: true },
  },
}));

vi.mock('@/lib/bout-engine', () => ({
  validateBoutRequest: validateBoutRequestMock,
  executeBout: executeBoutMock,
}));

vi.mock('@/lib/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ─── Import SUT ──────────────────────────────────────────────────────

import { POST } from '@/app/api/v1/bout/route';

// ─── Helpers ─────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/v1/bout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const mockContext = {
  boutId: 'test-bout-123',
  presetId: 'darwin-special',
  preset: {
    id: 'darwin-special',
    name: 'The Darwin Special',
    maxTurns: 6,
    agents: [
      { id: 'darwin', name: 'Darwin', systemPrompt: 'You are Darwin.', color: '#fff' },
      { id: 'cat', name: 'Cat', systemPrompt: 'You are a cat.', color: '#000' },
    ],
  },
  topic: 'evolution',
  lengthConfig: { id: 'standard', label: 'Standard', hint: '3-5 sentences', maxOutputTokens: 200, outputTokensPerTurn: 120 },
  formatConfig: { id: 'plain', label: 'Plain text', hint: 'no markup', instruction: 'Respond in plain text.' },
  modelId: 'claude-haiku-4-5-20251001',
  byokKey: '',
  userId: 'user_123',
  preauthMicro: 0,
  requestId: 'req-abc',
  db: {},
};

const mockResult = {
  transcript: [
    { turn: 0, agentId: 'darwin', agentName: 'Darwin', text: 'Natural selection...' },
    { turn: 1, agentId: 'cat', agentName: 'Cat', text: 'Meow.' },
  ],
  shareLine: 'Darwin got owned by a cat.',
  inputTokens: 1200,
  outputTokens: 800,
};

// ─── Tests ───────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
  authMock.mockResolvedValue({ userId: 'user_123' });
  getUserTierMock.mockResolvedValue('lab');
});

describe('POST /api/v1/bout', () => {
  describe('auth and tier gating', () => {
    it('U1: rejects unauthenticated requests with 401', async () => {
      authMock.mockResolvedValue({ userId: null });
      const res = await POST(makeRequest({ boutId: 'b1', presetId: 'p1' }));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Authentication required.');
    });

    it('U2: rejects free-tier users with 403', async () => {
      getUserTierMock.mockResolvedValue('free');
      const res = await POST(makeRequest({ boutId: 'b1', presetId: 'p1' }));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Pit Lab subscription');
    });

    it('U3: rejects pass-tier users with 403', async () => {
      getUserTierMock.mockResolvedValue('pass');
      const res = await POST(makeRequest({ boutId: 'b1', presetId: 'p1' }));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Pit Lab subscription');
    });
  });

  describe('validation pass-through', () => {
    it('U4: returns validation error when validateBoutRequest fails', async () => {
      validateBoutRequestMock.mockResolvedValue({
        error: new Response('Missing boutId.', { status: 400 }),
      });
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(400);
      expect(await res.text()).toBe('Missing boutId.');
    });
  });

  describe('successful bout execution', () => {
    it('H1: returns completed bout as JSON', async () => {
      validateBoutRequestMock.mockResolvedValue({ context: mockContext });
      executeBoutMock.mockResolvedValue(mockResult);

      const res = await POST(makeRequest({ boutId: 'test-bout-123', presetId: 'darwin-special' }));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.boutId).toBe('test-bout-123');
      expect(body.status).toBe('completed');
      expect(body.transcript).toHaveLength(2);
      expect(body.transcript[0].agentName).toBe('Darwin');
      expect(body.transcript[1].text).toBe('Meow.');
      expect(body.shareLine).toBe('Darwin got owned by a cat.');
      expect(body.agents).toEqual([
        { id: 'darwin', name: 'Darwin' },
        { id: 'cat', name: 'Cat' },
      ]);
      expect(body.usage).toEqual({ inputTokens: 1200, outputTokens: 800 });
    });

    it('H2: calls executeBout without onEvent callback (no streaming)', async () => {
      validateBoutRequestMock.mockResolvedValue({ context: mockContext });
      executeBoutMock.mockResolvedValue(mockResult);

      await POST(makeRequest({ boutId: 'test-bout-123', presetId: 'darwin-special' }));
      expect(executeBoutMock).toHaveBeenCalledWith(mockContext);
      // Verify no second argument (onEvent callback) is passed
      expect(executeBoutMock).toHaveBeenCalledTimes(1);
      expect(executeBoutMock.mock.calls[0]).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      validateBoutRequestMock.mockResolvedValue({ context: mockContext });
    });

    it('U5: returns 504 on timeout errors', async () => {
      executeBoutMock.mockRejectedValue(new Error('Request timeout exceeded'));
      const res = await POST(makeRequest({ boutId: 'b1', presetId: 'p1' }));
      expect(res.status).toBe(504);
      const body = await res.json();
      expect(body.error).toContain('timed out');
    });

    it('U6: returns 429 on rate limit errors', async () => {
      executeBoutMock.mockRejectedValue(new Error('429 Too Many Requests'));
      const res = await POST(makeRequest({ boutId: 'b1', presetId: 'p1' }));
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toContain('rate limited');
    });

    it('U7: returns 503 on overloaded errors', async () => {
      executeBoutMock.mockRejectedValue(new Error('529 overloaded'));
      const res = await POST(makeRequest({ boutId: 'b1', presetId: 'p1' }));
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toContain('overloaded');
    });

    it('U8: returns 500 on unknown errors', async () => {
      executeBoutMock.mockRejectedValue(new Error('Something unexpected'));
      const res = await POST(makeRequest({ boutId: 'b1', presetId: 'p1' }));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Internal server error.');
    });
  });

  describe('subscriptions disabled', () => {
    it('H3: allows any authenticated user when SUBSCRIPTIONS_ENABLED is false', async () => {
      vi.resetModules();

      vi.doMock('@clerk/nextjs/server', () => ({
        auth: vi.fn().mockResolvedValue({ userId: 'user_456' }),
      }));
      vi.doMock('@/lib/tier', () => ({
        SUBSCRIPTIONS_ENABLED: false,
        getUserTier: vi.fn(),
        TIER_CONFIG: {
          free: { apiAccess: false },
          pass: { apiAccess: false },
          lab: { apiAccess: true },
        },
      }));
      vi.doMock('@/lib/bout-engine', () => ({
        validateBoutRequest: vi.fn().mockResolvedValue({ context: mockContext }),
        executeBout: vi.fn().mockResolvedValue(mockResult),
      }));
      vi.doMock('@/lib/logger', () => ({
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      }));

      const { POST: FreePOST } = await import('@/app/api/v1/bout/route');
      const res = await FreePOST(makeRequest({ boutId: 'b1', presetId: 'p1' }));
      expect(res.status).toBe(200);
    });
  });
});
