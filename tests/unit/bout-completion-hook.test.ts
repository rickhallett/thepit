// Tests for the post-completion hook (RD-021).
//
// Validates that the onBoutCompleted callback on BoutContext is called
// at the right time with the right data, and that hook failures are
// caught without crashing the bout.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoutContext, BoutCompletionEvent } from '@/lib/bout-engine';

// ---------------------------------------------------------------------------
// Hoisted mocks - run before any import resolves.
// ---------------------------------------------------------------------------

const {
  mockDb,
  tracedStreamTextMock,
  untracedStreamTextMock,
  withTracingMock,
  serverTrackMock,
  serverCaptureAIGenerationMock,
  flushServerAnalyticsMock,
  sentryLoggerMock,
  computeCostGbpMock,
  computeCostUsdMock,
  settleCreditsMock,
  applyCreditDeltaMock,
  toMicroCreditsMock,
  estimateTokensFromTextMock,
  refundIntroPoolMock,
  detectRefusalMock,
  logRefusalMock,
  getModelMock,
  getInputTokenBudgetMock,
  appendExperimentInjectionMock,
} = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return {
    mockDb: db,
    tracedStreamTextMock: vi.fn(),
    untracedStreamTextMock: vi.fn(),
    withTracingMock: vi.fn((fn: unknown) => fn),
    serverTrackMock: vi.fn(),
    serverCaptureAIGenerationMock: vi.fn(),
    flushServerAnalyticsMock: vi.fn(),
    sentryLoggerMock: { info: vi.fn(), error: vi.fn() },
    computeCostGbpMock: vi.fn(),
    computeCostUsdMock: vi.fn(),
    settleCreditsMock: vi.fn(),
    applyCreditDeltaMock: vi.fn(),
    toMicroCreditsMock: vi.fn(),
    estimateTokensFromTextMock: vi.fn(),
    refundIntroPoolMock: vi.fn(),
    detectRefusalMock: vi.fn(),
    logRefusalMock: vi.fn(),
    getModelMock: vi.fn(),
    getInputTokenBudgetMock: vi.fn(),
    appendExperimentInjectionMock: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/db', () => ({ requireDb: () => mockDb }));

vi.mock('@/db/schema', () => ({
  bouts: {
    id: 'id',
    status: 'status',
    presetId: 'preset_id',
    transcript: 'transcript',
    topic: 'topic',
    responseLength: 'response_length',
    responseFormat: 'response_format',
    agentLineup: 'agent_lineup',
    ownerId: 'owner_id',
    updatedAt: 'updated_at',
    shareLine: 'share_line',
    shareGeneratedAt: 'share_generated_at',
    createdAt: 'created_at',
  },
  users: {
    id: 'id',
    activatedAt: 'activated_at',
  },
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));

vi.mock('@/lib/langsmith', () => ({
  tracedStreamText: tracedStreamTextMock,
  untracedStreamText: untracedStreamTextMock,
  withTracing: withTracingMock,
}));

vi.mock('@/lib/posthog-server', () => ({
  serverTrack: serverTrackMock,
  serverCaptureAIGeneration: serverCaptureAIGenerationMock,
  flushServerAnalytics: flushServerAnalyticsMock,
}));

vi.mock('@sentry/nextjs', () => ({
  logger: sentryLoggerMock,
}));

vi.mock('@/lib/credits', () => ({
  CREDITS_ENABLED: true,
  BYOK_ENABLED: true,
  applyCreditDelta: applyCreditDeltaMock,
  computeCostGbp: computeCostGbpMock,
  computeCostUsd: computeCostUsdMock,
  estimateBoutCostGbp: vi.fn(() => 0.005),
  estimateTokensFromText: estimateTokensFromTextMock,
  preauthorizeCredits: vi.fn(),
  settleCredits: settleCreditsMock,
  toMicroCredits: toMicroCreditsMock,
}));

vi.mock('@/lib/tier', () => ({
  SUBSCRIPTIONS_ENABLED: false,
  getUserTier: vi.fn(),
  canRunBout: vi.fn(),
  canAccessModel: vi.fn(),
  incrementFreeBoutsUsed: vi.fn(),
  getFreeBoutsUsed: vi.fn(),
}));

vi.mock('@/lib/intro-pool', () => ({
  getIntroPoolStatus: vi.fn(),
  consumeIntroPoolAnonymous: vi.fn(),
  refundIntroPool: refundIntroPoolMock,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  getClientIdentifier: vi.fn(),
}));

vi.mock('@/lib/byok', () => ({ readAndClearByokKey: vi.fn() }));

vi.mock('@/lib/ai', () => ({
  FREE_MODEL_ID: 'claude-haiku-4-5-20251001',
  PREMIUM_MODEL_OPTIONS: [],
  getModel: getModelMock,
  getInputTokenBudget: getInputTokenBudgetMock,
}));

vi.mock('@/lib/presets', () => ({
  getPresetById: vi.fn(),
  ARENA_PRESET_ID: 'arena',
  DEFAULT_AGENT_COLOR: '#888888',
}));

vi.mock('@/lib/bout-lineup', () => ({
  buildArenaPresetFromLineup: vi.fn(),
}));

vi.mock('@/lib/refusal-detection', () => ({
  detectRefusal: detectRefusalMock,
  logRefusal: logRefusalMock,
}));

vi.mock('@/lib/experiment', () => ({
  appendExperimentInjection: appendExperimentInjectionMock,
}));

vi.mock('@/lib/async-context', () => ({
  getContext: vi.fn(() => ({ country: 'GB' })),
}));

vi.mock('@/lib/request-context', () => ({
  getRequestId: vi.fn(() => 'req-test'),
}));

vi.mock('@/lib/models', () => ({
  FIRST_BOUT_PROMOTION_MODEL: 'claude-sonnet-4-5-20250929',
}));

// ---------------------------------------------------------------------------
// SUT
// ---------------------------------------------------------------------------

import { executeBout } from '@/lib/bout-engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a mock stream result that yields text chunks and returns usage. */
function createStreamResult(
  text: string,
  usage?: { inputTokens: number; outputTokens: number },
) {
  return {
    textStream: (async function* () {
      for (const chunk of text.match(/.{1,10}/g) ?? [text]) yield chunk;
    })(),
    usage: Promise.resolve(usage ?? { inputTokens: 100, outputTokens: 50 }),
    providerMetadata: Promise.resolve({}),
  };
}

/** Create a failing stream that throws after yielding partial text. */
function createFailingStream(partialText: string, error: Error) {
  return {
    textStream: (async function* () {
      yield partialText;
      throw error;
    })(),
    usage: Promise.resolve({ inputTokens: 50, outputTokens: 20 }),
    providerMetadata: Promise.resolve({}),
  };
}

const SINGLE_AGENT_PRESET = {
  id: 'test-preset',
  name: 'Test Preset',
  agents: [
    { id: 'agent-a', name: 'Alice', systemPrompt: 'You are Alice.', color: '#ff0000' },
  ],
  maxTurns: 1,
  tier: 'free' as const,
};

const TWO_AGENT_PRESET = {
  ...SINGLE_AGENT_PRESET,
  agents: [
    { id: 'agent-a', name: 'Alice', systemPrompt: 'You are Alice.', color: '#ff0000' },
    { id: 'agent-b', name: 'Bob', systemPrompt: 'You are Bob.', color: '#0000ff' },
  ],
  maxTurns: 2,
};

/** Build a minimal BoutContext for testing executeBout. */
function makeContext(overrides: Partial<BoutContext> = {}): BoutContext {
  return {
    boutId: 'bout-hook-1',
    presetId: 'test-preset',
    preset: SINGLE_AGENT_PRESET,
    topic: 'AI ethics',
    lengthConfig: {
      id: 'standard',
      label: 'Standard',
      hint: '3-5 sentences',
      maxOutputTokens: 200,
      outputTokensPerTurn: 120,
    },
    formatConfig: {
      id: 'spaced',
      label: 'Text + spacing',
      hint: 'rich formatting',
      instruction: 'Respond in Markdown.',
    },
    modelId: 'claude-haiku-4-5-20251001',
    byokData: null,
    userId: 'user-1',
    preauthMicro: 5000,
    introPoolConsumedMicro: 0,
    tier: 'free',
    requestId: 'req-test',
    db: mockDb as unknown as BoutContext['db'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('onBoutCompleted hook (RD-021)', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    tracedStreamTextMock.mockImplementation(() =>
      createStreamResult('Hello from AI!', { inputTokens: 100, outputTokens: 50 }),
    );
    untracedStreamTextMock.mockImplementation(() =>
      createStreamResult('Hello from BYOK!', { inputTokens: 80, outputTokens: 40 }),
    );

    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: vi.fn().mockImplementation(() => {
          const result = Object.assign(Promise.resolve({}), {
            returning: () => Promise.resolve([]),
          });
          return result;
        }),
      }),
    }));

    computeCostGbpMock.mockReturnValue(0.003);
    computeCostUsdMock.mockReturnValue({ inputCostUsd: 0.001, outputCostUsd: 0.002, totalCostUsd: 0.003 });
    toMicroCreditsMock.mockReturnValue(3000);
    estimateTokensFromTextMock.mockReturnValue(0);
    settleCreditsMock.mockResolvedValue({});
    applyCreditDeltaMock.mockResolvedValue({});
    refundIntroPoolMock.mockResolvedValue(undefined);
    flushServerAnalyticsMock.mockResolvedValue(undefined);
    serverTrackMock.mockResolvedValue(undefined);
    getModelMock.mockReturnValue('mock-model-instance');
    getInputTokenBudgetMock.mockReturnValue(170_000);
    detectRefusalMock.mockReturnValue(null);

    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => [{ value: 5 }],
      }),
    }));
  });

  // =========================================================================
  // H-01 to H-04: Hook invocation behaviour
  // =========================================================================

  it('H-01: hook called after successful bout with correct event shape', async () => {
    const hookMock = vi.fn();
    const ctx = makeContext({ onBoutCompleted: hookMock });
    await executeBout(ctx);

    expect(hookMock).toHaveBeenCalledTimes(1);
    const event: BoutCompletionEvent = hookMock.mock.calls[0]![0];
    expect(event.boutId).toBe('bout-hook-1');
    expect(event.presetId).toBe('test-preset');
    expect(event.ownerId).toBe('user-1');
    expect(event.status).toBe('completed');
    expect(event.winnerId).toBeNull();
    expect(event.transcript).toHaveLength(1);
    expect(event.transcript[0]!.agentId).toBe('agent-a');
    expect(event.agentLineup).toEqual([{ id: 'agent-a', name: 'Alice' }]);
  });

  it('H-02: hook error is caught and logged without crashing the bout', async () => {
    const hookMock = vi.fn().mockRejectedValue(new Error('hook explosion'));
    const ctx = makeContext({ onBoutCompleted: hookMock });

    // Should not throw - the hook error is caught
    const result = await executeBout(ctx);
    expect(result.transcript).toHaveLength(1);
    expect(hookMock).toHaveBeenCalledTimes(1);
  });

  it('H-03: hook is not called when not provided', async () => {
    // No onBoutCompleted in context
    const ctx = makeContext();
    const result = await executeBout(ctx);

    // Bout completes normally. No way to assert "not called" on something
    // that doesn't exist, but we verify the bout completes without error.
    expect(result.transcript).toHaveLength(1);
  });

  it('H-04: hook receives error status on bout failure', async () => {
    tracedStreamTextMock.mockImplementation(() =>
      createFailingStream('partial', new Error('LLM failure')),
    );

    const hookMock = vi.fn();
    const ctx = makeContext({ onBoutCompleted: hookMock });

    await expect(executeBout(ctx)).rejects.toThrow('LLM failure');

    expect(hookMock).toHaveBeenCalledTimes(1);
    const event: BoutCompletionEvent = hookMock.mock.calls[0]![0];
    expect(event.status).toBe('error');
    expect(event.boutId).toBe('bout-hook-1');
    expect(event.ownerId).toBe('user-1');
  });

  // =========================================================================
  // H-05 to H-08: Edge cases
  // =========================================================================

  it('H-05: hook receives null ownerId for anonymous bouts', async () => {
    const hookMock = vi.fn();
    const ctx = makeContext({ userId: null, preauthMicro: 0, onBoutCompleted: hookMock });
    await executeBout(ctx);

    const event: BoutCompletionEvent = hookMock.mock.calls[0]![0];
    expect(event.ownerId).toBeNull();
  });

  it('H-06: hook receives full agent lineup for multi-agent bouts', async () => {
    const hookMock = vi.fn();
    const ctx = makeContext({ preset: TWO_AGENT_PRESET, onBoutCompleted: hookMock });
    await executeBout(ctx);

    const event: BoutCompletionEvent = hookMock.mock.calls[0]![0];
    expect(event.agentLineup).toEqual([
      { id: 'agent-a', name: 'Alice' },
      { id: 'agent-b', name: 'Bob' },
    ]);
    expect(event.transcript).toHaveLength(2);
  });

  it('H-07: synchronous hook (returning void) works without error', async () => {
    const hookMock = vi.fn(); // returns undefined (void)
    const ctx = makeContext({ onBoutCompleted: hookMock });
    const result = await executeBout(ctx);

    expect(hookMock).toHaveBeenCalledTimes(1);
    expect(result.transcript).toHaveLength(1);
  });

  it('H-08: hook error on error path does not prevent error re-throw', async () => {
    tracedStreamTextMock.mockImplementation(() =>
      createFailingStream('partial', new Error('original error')),
    );

    const hookMock = vi.fn().mockRejectedValue(new Error('hook also fails'));
    const ctx = makeContext({ onBoutCompleted: hookMock });

    // The original error should still propagate
    await expect(executeBout(ctx)).rejects.toThrow('original error');
    expect(hookMock).toHaveBeenCalledTimes(1);
  });
});
