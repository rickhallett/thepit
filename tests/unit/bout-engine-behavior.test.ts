/**
 * Behavior tests: validate → execute composed scenarios.
 *
 * These tests exercise the full bout-engine pipeline: validateBoutRequest()
 * returns a BoutContext, which is then passed to executeBout(). This catches
 * integration issues between the two phases that unit tests of each phase
 * in isolation would miss.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockDb,
  authMock,
  getUserTierMock,
  canRunBoutMock,
  canAccessModelMock,
  incrementFreeBoutsUsedMock,
  getFreeBoutsUsedMock,
  getPresetByIdMock,
  buildArenaPresetFromLineupMock,
  readAndClearByokKeyMock,
  checkRateLimitMock,
  getClientIdentifierMock,
  preauthorizeCreditsMock,
  estimateBoutCostGbpMock,
  toMicroCreditsMock,
  getIntroPoolStatusMock,
  consumeIntroPoolAnonymousMock,
  refundIntroPoolMock,
  tracedStreamTextMock,
  untracedStreamTextMock,
  computeCostGbpMock,
  computeCostUsdMock,
  settleCreditsMock,
  applyCreditDeltaMock,
  estimateTokensFromTextMock,
  MODELS,
} = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  const MODELS = {
    HAIKU: 'claude-haiku-4-5-20251001',
    SONNET_45: 'claude-sonnet-4-5-20250929',
    SONNET_46: 'claude-sonnet-4-6',
  } as const;
  return {
    mockDb: db,
    authMock: vi.fn(),
    getUserTierMock: vi.fn(),
    canRunBoutMock: vi.fn(),
    canAccessModelMock: vi.fn(),
    incrementFreeBoutsUsedMock: vi.fn(),
    getFreeBoutsUsedMock: vi.fn(),
    getPresetByIdMock: vi.fn(),
    buildArenaPresetFromLineupMock: vi.fn(),
    readAndClearByokKeyMock: vi.fn(),
    checkRateLimitMock: vi.fn(),
    getClientIdentifierMock: vi.fn(),
    preauthorizeCreditsMock: vi.fn(),
    estimateBoutCostGbpMock: vi.fn(),
    toMicroCreditsMock: vi.fn(),
    getIntroPoolStatusMock: vi.fn(),
    consumeIntroPoolAnonymousMock: vi.fn(),
    refundIntroPoolMock: vi.fn(),
    tracedStreamTextMock: vi.fn(),
    untracedStreamTextMock: vi.fn(),
    computeCostGbpMock: vi.fn(),
    computeCostUsdMock: vi.fn(),
    settleCreditsMock: vi.fn(),
    applyCreditDeltaMock: vi.fn(),
    estimateTokensFromTextMock: vi.fn(),
    MODELS,
  };
});

// ---------------------------------------------------------------------------
// Module mocks (comprehensive — supports both validate and execute)
// ---------------------------------------------------------------------------

vi.mock('@/db', () => ({ requireDb: () => mockDb }));

vi.mock('@/db/schema', () => ({
  bouts: {
    id: 'id', status: 'status', presetId: 'preset_id', transcript: 'transcript',
    topic: 'topic', responseLength: 'response_length', responseFormat: 'response_format',
    agentLineup: 'agent_lineup', ownerId: 'owner_id', updatedAt: 'updated_at',
    shareLine: 'share_line', shareGeneratedAt: 'share_generated_at', createdAt: 'created_at',
    maxTurns: 'max_turns',
  },
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => null), set: vi.fn(), delete: vi.fn() })),
}));

vi.mock('@/lib/tier', () => ({
  SUBSCRIPTIONS_ENABLED: true,
  getUserTier: getUserTierMock,
  canRunBout: canRunBoutMock,
  canAccessModel: canAccessModelMock,
  incrementFreeBoutsUsed: incrementFreeBoutsUsedMock,
  getFreeBoutsUsed: getFreeBoutsUsedMock,
}));

vi.mock('@/lib/ai', () => ({
  FREE_MODEL_ID: MODELS.HAIKU,
  PREMIUM_MODEL_OPTIONS: [MODELS.SONNET_46, MODELS.SONNET_45],
  DEFAULT_PREMIUM_MODEL_ID: MODELS.SONNET_46,
  getModel: vi.fn(() => 'mock-model'),
  getInputTokenBudget: vi.fn(() => 170_000),
}));

vi.mock('@/lib/presets', () => ({
  getPresetById: getPresetByIdMock,
  ARENA_PRESET_ID: 'arena',
  DEFAULT_AGENT_COLOR: '#888888',
}));

vi.mock('@/lib/bout-lineup', () => ({ buildArenaPresetFromLineup: buildArenaPresetFromLineupMock }));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIdentifier: getClientIdentifierMock,
}));

vi.mock('@/lib/credits', () => ({
  CREDITS_ENABLED: true,
  BYOK_ENABLED: true,
  applyCreditDelta: applyCreditDeltaMock,
  computeCostGbp: computeCostGbpMock,
  computeCostUsd: computeCostUsdMock,
  estimateBoutCostGbp: estimateBoutCostGbpMock,
  estimateTokensFromText: estimateTokensFromTextMock,
  preauthorizeCredits: preauthorizeCreditsMock,
  settleCredits: settleCreditsMock,
  toMicroCredits: toMicroCreditsMock,
}));

vi.mock('@/lib/intro-pool', () => ({
  getIntroPoolStatus: getIntroPoolStatusMock,
  consumeIntroPoolAnonymous: consumeIntroPoolAnonymousMock,
  refundIntroPool: refundIntroPoolMock,
}));

vi.mock('@/lib/byok', () => ({ readAndClearByokKey: readAndClearByokKeyMock }));

vi.mock('@/lib/response-lengths', () => ({
  resolveResponseLength: vi.fn(() => ({
    id: 'standard', label: 'Standard', hint: '3-5 sentences',
    maxOutputTokens: 200, outputTokensPerTurn: 120,
  })),
}));

vi.mock('@/lib/response-formats', () => ({
  resolveResponseFormat: vi.fn(() => ({
    id: 'spaced', label: 'Text + spacing', hint: 'rich formatting',
    instruction: 'Respond in Markdown.',
  })),
}));

vi.mock('@/lib/langsmith', () => ({
  tracedStreamText: tracedStreamTextMock,
  untracedStreamText: untracedStreamTextMock,
  withTracing: vi.fn((fn: unknown) => fn),
}));

vi.mock('@/lib/posthog-server', () => ({
  serverTrack: vi.fn(),
  serverCaptureAIGeneration: vi.fn(),
  flushServerAnalytics: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/refusal-detection', () => ({ detectRefusal: vi.fn(() => null), logRefusal: vi.fn() }));
vi.mock('@/lib/experiment', () => ({ appendExperimentInjection: vi.fn() }));
vi.mock('@/lib/async-context', () => ({ getContext: vi.fn(() => ({})) }));
vi.mock('@/lib/request-context', () => ({ getRequestId: vi.fn(() => 'req-test') }));
vi.mock('@/lib/models', () => ({ FIRST_BOUT_PROMOTION_MODEL: MODELS.SONNET_45 }));

// ---------------------------------------------------------------------------
// SUT
// ---------------------------------------------------------------------------

import { validateBoutRequest, executeBout } from '@/lib/bout-engine';
import type { TurnEvent } from '@/lib/bout-engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createStreamResult(text: string, usage?: { inputTokens: number; outputTokens: number }) {
  return {
    textStream: (async function* () { for (const c of text.match(/.{1,10}/g) ?? [text]) yield c; })(),
    usage: Promise.resolve(usage ?? { inputTokens: 100, outputTokens: 50 }),
    providerMetadata: Promise.resolve({}),
  };
}

function createFailingStream(partial: string, error: Error) {
  return {
    textStream: (async function* () { yield partial; throw error; })(),
    usage: Promise.resolve({ inputTokens: 50, outputTokens: 20 }),
    providerMetadata: Promise.resolve({}),
  };
}

const MINIMAL_PRESET = {
  id: 'darwin-special',
  name: 'Test',
  agents: [
    { id: 'a1', name: 'Agent1', systemPrompt: 'You are Agent1.', color: '#fff' },
    { id: 'a2', name: 'Agent2', systemPrompt: 'You are Agent2.', color: '#000' },
  ],
  maxTurns: 2,
  tier: 'free' as const,
};

const makeRequest = (body: Record<string, unknown>, headers?: Record<string, string>) =>
  new Request('http://localhost/api/run-bout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  });

/** Full happy-path setup for anonymous bouts. */
const setupAnonymous = () => {
  authMock.mockResolvedValue({ userId: null });
  getPresetByIdMock.mockReturnValue(MINIMAL_PRESET);
  checkRateLimitMock.mockReturnValue({ success: true, remaining: 4, resetAt: Date.now() + 3600000 });
  getClientIdentifierMock.mockReturnValue('test-ip');
  estimateBoutCostGbpMock.mockReturnValue(0.005);
  toMicroCreditsMock.mockReturnValue(5000);
  getIntroPoolStatusMock.mockResolvedValue({ exhausted: false, remainingMicro: 100000 });
  consumeIntroPoolAnonymousMock.mockResolvedValue({ consumed: true });
  mockDb.select.mockImplementation(() => ({
    from: () => ({ where: () => ({ limit: async () => [] }) }),
  }));
  mockDb.insert.mockImplementation(() => ({
    values: () => ({ onConflictDoNothing: async () => ({}) }),
  }));
  mockDb.update.mockImplementation(() => ({
    set: () => ({ where: async () => ({}) }),
  }));
  tracedStreamTextMock.mockImplementation(() => createStreamResult('AI response'));
  computeCostGbpMock.mockReturnValue(0.003);
  computeCostUsdMock.mockReturnValue({ inputCostUsd: 0, outputCostUsd: 0, totalCostUsd: 0 });
  estimateTokensFromTextMock.mockReturnValue(0);
  refundIntroPoolMock.mockResolvedValue(undefined);
};

/** Full happy-path setup for authenticated bouts. */
const setupAuthenticated = () => {
  setupAnonymous();
  authMock.mockResolvedValue({ userId: 'user-1' });
  getUserTierMock.mockResolvedValue('free');
  canRunBoutMock.mockResolvedValue({ allowed: true });
  canAccessModelMock.mockReturnValue(true);
  incrementFreeBoutsUsedMock.mockResolvedValue(undefined);
  getFreeBoutsUsedMock.mockResolvedValue(1);
  preauthorizeCreditsMock.mockResolvedValue({ success: true });
  settleCreditsMock.mockResolvedValue({});
  applyCreditDeltaMock.mockResolvedValue({});
};

// ---------------------------------------------------------------------------
// Tests — B-01 to B-12
// ---------------------------------------------------------------------------

describe('bout-engine behavior (validate → execute)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RESEARCH_API_KEY;
  });

  it('B-01: anonymous bout via intro pool — full lifecycle', async () => {
    setupAnonymous();

    const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
    const result = await validateBoutRequest(req);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.context.tier).toBe('anonymous');
    expect(result.context.introPoolConsumedMicro).toBeGreaterThan(0);
    expect(result.context.preauthMicro).toBe(0); // Anonymous uses pool, not preauth

    const boutResult = await executeBout(result.context);
    expect(boutResult.transcript).toHaveLength(2);
    expect(boutResult.shareLine).toBeTruthy();
  });

  it('B-02: authenticated free-tier bout — preauth → execute → settle', async () => {
    setupAuthenticated();
    toMicroCreditsMock.mockReturnValue(5000);

    const req = makeRequest({ boutId: 'b2', presetId: 'darwin-special' });
    const result = await validateBoutRequest(req);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.context.userId).toBe('user-1');
    expect(result.context.preauthMicro).toBe(5000);

    const boutResult = await executeBout(result.context);
    expect(boutResult.transcript).toHaveLength(2);
  });

  it('B-03: BYOK bout — untracedStreamText, BYOK model', async () => {
    setupAuthenticated();
    readAndClearByokKeyMock.mockReturnValue({
      provider: 'anthropic',
      modelId: 'claude-sonnet-4-5-20250929',
      key: 'sk-ant-test',
    });
    untracedStreamTextMock.mockImplementation(() => createStreamResult('BYOK response'));

    const req = makeRequest({ boutId: 'b3', presetId: 'darwin-special', model: 'byok' });
    const result = await validateBoutRequest(req);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.context.modelId).toBe('byok');
    expect(result.context.byokData?.provider).toBe('anthropic');

    const boutResult = await executeBout(result.context);
    expect(boutResult.transcript).toHaveLength(2);
    expect(untracedStreamTextMock).toHaveBeenCalled();
  });

  it('B-04: LLM fails turn 2 of 2 — partial transcript, refund, re-throw', async () => {
    setupAuthenticated();
    // Preauth: 5000 micro. After partial execution, actual cost is only 1000.
    // Refund = 5000 - 1000 = 4000.
    let toMicroCallCount = 0;
    toMicroCreditsMock.mockImplementation(() => {
      toMicroCallCount++;
      // First call: estimateBoutCost → preauthMicro
      // Second call (error path): actualCost → actualMicro
      return toMicroCallCount === 1 ? 5000 : 1000;
    });

    let turnCount = 0;
    tracedStreamTextMock.mockImplementation(() => {
      turnCount++;
      if (turnCount === 1) return createStreamResult('Turn 1 OK');
      return createFailingStream('partial', new Error('LLM failure'));
    });

    const req = makeRequest({ boutId: 'b4', presetId: 'darwin-special' });
    const result = await validateBoutRequest(req);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    await expect(executeBout(result.context)).rejects.toThrow('LLM failure');
    // Credit refund should have been called with the difference
    expect(applyCreditDeltaMock).toHaveBeenCalledWith(
      'user-1',
      4000, // 5000 preauth - 1000 actual
      'settlement-error',
      expect.any(Object),
    );
  });

  it('B-05: anonymous error — intro pool refund', async () => {
    setupAnonymous();
    consumeIntroPoolAnonymousMock.mockResolvedValue({ consumed: true });
    tracedStreamTextMock.mockImplementation(() =>
      createFailingStream('fail', new Error('anon error')),
    );

    const req = makeRequest({ boutId: 'b5', presetId: 'darwin-special' });
    const result = await validateBoutRequest(req);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.context.introPoolConsumedMicro).toBeGreaterThan(0);
    await expect(executeBout(result.context)).rejects.toThrow('anon error');
    expect(refundIntroPoolMock).toHaveBeenCalled();
  });

  it('B-06: idempotency — completed bout returns 409', async () => {
    setupAnonymous();
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{
            status: 'completed',
            presetId: 'darwin-special',
            transcript: [{ agentId: 'a1', text: 'done', turn: 0 }],
            ownerId: null,
          }],
        }),
      }),
    }));

    const req = makeRequest({ boutId: 'b6', presetId: 'darwin-special' });
    const result = await validateBoutRequest(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(409);
    }
  });

  it('B-07: first-bout promotion', async () => {
    setupAuthenticated();
    getFreeBoutsUsedMock.mockResolvedValue(0); // First bout

    const req = makeRequest({ boutId: 'b7', presetId: 'darwin-special' });
    const result = await validateBoutRequest(req);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.context.modelId).toBe(MODELS.SONNET_45);
  });

  it('B-08: rate limit + tier — 429 with upgrade URLs', async () => {
    setupAuthenticated();
    getUserTierMock.mockResolvedValue('free');
    checkRateLimitMock.mockReturnValue({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 3600000,
    });

    const req = makeRequest({ boutId: 'b8', presetId: 'darwin-special' });
    const result = await validateBoutRequest(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(429);
      const body = await result.error.json();
      expect(body.upgradeTiers).toBeDefined();
    }
  });

  it('B-09: arena custom lineup from agentLineup JSONB', async () => {
    setupAuthenticated();
    getPresetByIdMock.mockReturnValue(undefined); // Not in static registry
    const arenaPreset = {
      id: 'arena',
      name: 'Arena',
      agents: [
        { id: 'custom-1', name: 'Custom1', systemPrompt: 'Custom.', color: '#aaa' },
        { id: 'custom-2', name: 'Custom2', systemPrompt: 'Custom.', color: '#bbb' },
      ],
      maxTurns: 2,
      tier: 'premium' as const,
    };
    buildArenaPresetFromLineupMock.mockReturnValue(arenaPreset);
    canAccessModelMock.mockReturnValue(true);
    getUserTierMock.mockResolvedValue('pass');

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            selectCallCount++;
            if (selectCallCount === 1) return [];
            return [{
              agentLineup: [{ id: 'custom-1', name: 'Custom1', systemPrompt: 'Custom.' }],
              topic: 'Arena topic',
              responseLength: 'standard',
              responseFormat: 'spaced',
              maxTurns: 2,
            }];
          },
        }),
      }),
    }));

    const req = makeRequest({ boutId: 'b9', presetId: 'arena' });
    const result = await validateBoutRequest(req);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(buildArenaPresetFromLineupMock).toHaveBeenCalled();
    expect(result.context.preset.id).toBe('arena');
  });

  it('B-10: multi-turn bout with history accumulation', async () => {
    setupAnonymous();
    const sixTurnPreset = {
      ...MINIMAL_PRESET,
      maxTurns: 6,
    };
    getPresetByIdMock.mockReturnValue(sixTurnPreset);

    const req = makeRequest({ boutId: 'b10', presetId: 'darwin-special' });
    const result = await validateBoutRequest(req);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const boutResult = await executeBout(result.context);
    expect(boutResult.transcript).toHaveLength(6);
    // Each turn should have incrementing turn numbers
    for (let i = 0; i < 6; i++) {
      expect(boutResult.transcript[i]!.turn).toBe(i);
    }
  });

  it('B-11: share line lifecycle — generate, trim, emit, persist', async () => {
    setupAnonymous();
    const events: TurnEvent[] = [];

    const req = makeRequest({ boutId: 'b11', presetId: 'darwin-special' });
    const result = await validateBoutRequest(req);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const boutResult = await executeBout(result.context, (e) => events.push(e));
    expect(boutResult.shareLine).toBeTruthy();
    expect(typeof boutResult.shareLine).toBe('string');

    // Share line event should have been emitted
    const shareEvent = events.find((e) => e.type === 'data-share-line');
    expect(shareEvent).toBeDefined();
  });

  it('B-12: research bypass — lab tier, no limits, no credits', async () => {
    process.env.RESEARCH_API_KEY = 'research-secret';
    setupAnonymous();

    const req = makeRequest(
      { boutId: 'b12', presetId: 'darwin-special' },
      { 'x-research-key': 'research-secret' },
    );
    const result = await validateBoutRequest(req);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.context.tier).toBe('lab');
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(getIntroPoolStatusMock).not.toHaveBeenCalled();

    const boutResult = await executeBout(result.context);
    expect(boutResult.transcript).toHaveLength(2);
  });
});
