import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MODEL_IDS } from '@/lib/models';

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

function makeRequest(
  body: Record<string, unknown> = {},
  headers?: Record<string, string>,
) {
  const h = new Headers({ 'Content-Type': 'application/json' });
  if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      h.set(k, v);
    }
  }
  return new Request('http://localhost/api/v1/bout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: h,
  });
}

const mockContext = {
  boutId: 'test-bout-exp',
  presetId: 'rea-baseline',
  preset: {
    id: 'rea-baseline',
    name: 'RE-A Baseline',
    maxTurns: 12,
    agents: [
      { id: 'elder', name: 'Elder Maren', systemPrompt: 'You are Elder Maren.', color: '#aaa' },
      { id: 'finn', name: 'Finn', systemPrompt: 'You are Finn.', color: '#bbb' },
      { id: 'tomas', name: 'Tomas', systemPrompt: 'You are Tomas.', color: '#ccc' },
      { id: 'sera', name: 'Sera', systemPrompt: 'You are Sera.', color: '#ddd' },
    ],
  },
  topic: 'Winter preparation',
  lengthConfig: { id: 'standard', label: 'Standard', hint: '3-5 sentences', maxOutputTokens: 200, outputTokensPerTurn: 120 },
  formatConfig: { id: 'plain', label: 'Plain text', hint: 'no markup', instruction: 'Respond in plain text.' },
  modelId: MODEL_IDS.HAIKU,
  byokData: null,
  userId: 'user_123',
  preauthMicro: 0,
  introPoolConsumedMicro: 0,
  tier: 'lab' as const,
  requestId: 'req-exp',
  db: {},
};

const mockResult = {
  transcript: [
    { turn: 0, agentId: 'elder', agentName: 'Elder Maren', text: 'We must prepare...' },
    { turn: 1, agentId: 'finn', agentName: 'Finn', text: 'I agree, but...' },
  ],
  shareLine: 'The village debates.',
  inputTokens: 2400,
  outputTokens: 1600,
};

// ─── Tests ───────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
  authMock.mockResolvedValue({ userId: 'user_123' });
  getUserTierMock.mockResolvedValue('lab');
  // Set RESEARCH_API_KEY for experiment tests
  process.env.RESEARCH_API_KEY = 'test-research-key-abc123';
});

describe('POST /api/v1/bout — experiment config', () => {
  describe('auth gating', () => {
    it('rejects experimentConfig without X-Research-Key header', async () => {
      validateBoutRequestMock.mockResolvedValue({ ok: true, context: { ...mockContext } });

      const res = await POST(makeRequest({
        boutId: 'b1',
        presetId: 'rea-baseline',
        experimentConfig: {
          promptInjections: [{ afterTurn: 5, targetAgentIndex: 0, content: 'test' }],
        },
      }));

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('X-Research-Key');
    });

    it('rejects experimentConfig with wrong X-Research-Key', async () => {
      validateBoutRequestMock.mockResolvedValue({ ok: true, context: { ...mockContext } });

      const res = await POST(makeRequest(
        {
          boutId: 'b1',
          presetId: 'rea-baseline',
          experimentConfig: {
            promptInjections: [{ afterTurn: 5, targetAgentIndex: 0, content: 'test' }],
          },
        },
        { 'X-Research-Key': 'wrong-key' },
      ));

      expect(res.status).toBe(403);
    });

    it('accepts experimentConfig with valid X-Research-Key', async () => {
      validateBoutRequestMock.mockResolvedValue({ ok: true, context: { ...mockContext } });
      executeBoutMock.mockResolvedValue(mockResult);

      const res = await POST(makeRequest(
        {
          boutId: 'b1',
          presetId: 'rea-baseline',
          experimentConfig: {
            promptInjections: [{ afterTurn: 5, targetAgentIndex: 0, content: 'test' }],
          },
        },
        { 'X-Research-Key': 'test-research-key-abc123' },
      ));

      expect(res.status).toBe(200);
    });
  });

  describe('validation errors', () => {
    it('rejects invalid experimentConfig with 400', async () => {
      validateBoutRequestMock.mockResolvedValue({ ok: true, context: { ...mockContext } });

      const res = await POST(makeRequest(
        {
          boutId: 'b1',
          presetId: 'rea-baseline',
          experimentConfig: {
            promptInjections: [{ afterTurn: -1, targetAgentIndex: 0, content: 'test' }],
          },
        },
        { 'X-Research-Key': 'test-research-key-abc123' },
      ));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('afterTurn');
    });

    it('rejects turn numbers exceeding preset maxTurns', async () => {
      validateBoutRequestMock.mockResolvedValue({ ok: true, context: { ...mockContext } });

      const res = await POST(makeRequest(
        {
          boutId: 'b1',
          presetId: 'rea-baseline',
          experimentConfig: {
            scriptedTurns: [{ turn: 15, agentIndex: 0, content: 'too late' }],
          },
        },
        { 'X-Research-Key': 'test-research-key-abc123' },
      ));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('exceeds maxTurns');
    });
  });

  describe('context attachment', () => {
    it('attaches promptHook to context when promptInjections configured', async () => {
      const capturedContext = { ...mockContext };
      validateBoutRequestMock.mockResolvedValue({ ok: true, context: capturedContext });
      executeBoutMock.mockResolvedValue(mockResult);

      await POST(makeRequest(
        {
          boutId: 'b1',
          presetId: 'rea-baseline',
          experimentConfig: {
            promptInjections: [{ afterTurn: 5, targetAgentIndex: 0, content: 'injected' }],
          },
        },
        { 'X-Research-Key': 'test-research-key-abc123' },
      ));

      expect(executeBoutMock).toHaveBeenCalledTimes(1);
      const ctxArg = executeBoutMock.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(ctxArg.promptHook).toBeDefined();
      expect(typeof ctxArg.promptHook).toBe('function');
    });

    it('attaches scriptedTurns to context when configured', async () => {
      const capturedContext = { ...mockContext };
      validateBoutRequestMock.mockResolvedValue({ ok: true, context: capturedContext });
      executeBoutMock.mockResolvedValue(mockResult);

      await POST(makeRequest(
        {
          boutId: 'b1',
          presetId: 'rea-baseline',
          experimentConfig: {
            scriptedTurns: [{ turn: 6, agentIndex: 1, content: 'scripted text' }],
          },
        },
        { 'X-Research-Key': 'test-research-key-abc123' },
      ));

      const ctxArg = executeBoutMock.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(ctxArg.scriptedTurns).toBeDefined();
      expect(ctxArg.scriptedTurns).toBeInstanceOf(Map);
      expect((ctxArg.scriptedTurns as Map<number, unknown>).get(6)).toEqual({
        agentIndex: 1,
        content: 'scripted text',
      });
    });

    it('does not attach experiment fields when experimentConfig absent', async () => {
      const capturedContext = { ...mockContext };
      validateBoutRequestMock.mockResolvedValue({ ok: true, context: capturedContext });
      executeBoutMock.mockResolvedValue(mockResult);

      await POST(makeRequest(
        { boutId: 'b1', presetId: 'rea-baseline' },
        { 'X-Research-Key': 'test-research-key-abc123' },
      ));

      const ctxArg = executeBoutMock.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(ctxArg.promptHook).toBeUndefined();
      expect(ctxArg.scriptedTurns).toBeUndefined();
    });
  });

  describe('regression — no experiment config', () => {
    it('works identically to baseline when no experimentConfig present', async () => {
      validateBoutRequestMock.mockResolvedValue({ ok: true, context: { ...mockContext } });
      executeBoutMock.mockResolvedValue(mockResult);

      const res = await POST(makeRequest({ boutId: 'b1', presetId: 'rea-baseline' }));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.boutId).toBe('test-bout-exp');
      expect(body.status).toBe('completed');
      expect(body.transcript).toHaveLength(2);
    });

    it('executeBout called with clean context (no experiment fields)', async () => {
      validateBoutRequestMock.mockResolvedValue({ ok: true, context: { ...mockContext } });
      executeBoutMock.mockResolvedValue(mockResult);

      await POST(makeRequest({ boutId: 'b1', presetId: 'rea-baseline' }));

      const ctxArg = executeBoutMock.mock.calls[0]?.[0] as Record<string, unknown>;
      // When no experimentConfig in body, neither promptHook nor scriptedTurns should be set
      expect(ctxArg.promptHook).toBeUndefined();
      expect(ctxArg.scriptedTurns).toBeUndefined();
    });
  });
});
