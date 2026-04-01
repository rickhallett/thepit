// Timeout tests for the bout engine streaming turn loop.
//
// Validates that per-turn and share-line timeouts are handled gracefully:
// partial transcripts are preserved, error SSE events are emitted, and
// the bout completes without crashing.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoutContext, TurnEvent } from '@/lib/bout-engine';

// ---------------------------------------------------------------------------
// Hoisted mocks -- run before any import resolves.
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
  providerMeta?: Record<string, unknown>,
) {
  return {
    textStream: (async function* () {
      for (const chunk of text.match(/.{1,10}/g) ?? [text]) yield chunk;
    })(),
    usage: Promise.resolve(usage ?? { inputTokens: 100, outputTokens: 50 }),
    providerMetadata: Promise.resolve(providerMeta ?? {}),
  };
}

/**
 * Create a stream that never resolves -- simulates a provider that hangs
 * indefinitely. The stream yields nothing and blocks forever on the first
 * iteration, which would trigger a chunkMs timeout in production.
 *
 * In tests, we simulate this by throwing a timeout error immediately
 * since we do not use real timers.
 */
function createHangingStream() {
  return {
    textStream: (async function* () {
      throw new Error('Connection timeout: no chunks received within 10000ms');
    })(),
    usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
    providerMetadata: Promise.resolve({}),
  };
}

/**
 * Create a stream that yields one chunk then throws a timeout error.
 * Simulates a provider that starts responding but stalls mid-turn,
 * triggering the chunkMs timeout after partial output.
 */
function createSlowStream(partialText: string) {
  return {
    textStream: (async function* () {
      yield partialText;
      throw new Error('Stream timeout: no new chunks within 10000ms');
    })(),
    usage: Promise.resolve({ inputTokens: 50, outputTokens: 10 }),
    providerMetadata: Promise.resolve({}),
  };
}

const TWO_AGENT_PRESET = {
  id: 'test-preset',
  name: 'Test Preset',
  agents: [
    { id: 'agent-a', name: 'Alice', systemPrompt: 'You are Alice.', color: '#ff0000' },
    { id: 'agent-b', name: 'Bob', systemPrompt: 'You are Bob.', color: '#0000ff' },
  ],
  maxTurns: 2,
  tier: 'free' as const,
};

const FOUR_TURN_PRESET = {
  id: 'test-preset',
  name: 'Test Preset',
  agents: [
    { id: 'agent-a', name: 'Alice', systemPrompt: 'You are Alice.', color: '#ff0000' },
    { id: 'agent-b', name: 'Bob', systemPrompt: 'You are Bob.', color: '#0000ff' },
  ],
  maxTurns: 4,
  tier: 'free' as const,
};

/** Build a minimal BoutContext for testing executeBout. */
function makeContext(overrides: Partial<BoutContext> = {}): BoutContext {
  return {
    boutId: 'bout-timeout-1',
    presetId: 'test-preset',
    preset: TWO_AGENT_PRESET,
    topic: 'timeout handling',
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
    requestId: 'req-timeout-test',
    db: mockDb as unknown as BoutContext['db'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('executeBout - timeout handling', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default: healthy stream
    tracedStreamTextMock.mockImplementation(() =>
      createStreamResult('Hello from AI!', { inputTokens: 100, outputTokens: 50 }),
    );
    untracedStreamTextMock.mockImplementation(() =>
      createStreamResult('Hello from BYOK!', { inputTokens: 80, outputTokens: 40 }),
    );

    // Default DB mocks
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

    // Default credit mocks
    computeCostGbpMock.mockReturnValue(0.003);
    computeCostUsdMock.mockReturnValue({ inputCostUsd: 0.001, outputCostUsd: 0.002, totalCostUsd: 0.003 });
    toMicroCreditsMock.mockReturnValue(3000);
    estimateTokensFromTextMock.mockReturnValue(0);
    settleCreditsMock.mockResolvedValue({});
    applyCreditDeltaMock.mockResolvedValue({});
    refundIntroPoolMock.mockResolvedValue(undefined);
    flushServerAnalyticsMock.mockResolvedValue(undefined);
    serverTrackMock.mockResolvedValue(undefined);

    // Default model mocks
    getModelMock.mockReturnValue('mock-model-instance');
    getInputTokenBudgetMock.mockReturnValue(170_000);

    // Default refusal detection
    detectRefusalMock.mockReturnValue(null);

    // Default DB select
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => [{ value: 5 }],
      }),
    }));
  });

  // =========================================================================
  // Single turn timeout
  // =========================================================================

  it('single turn timeout emits error event and bout continues to next agent', async () => {
    // Turn 0 (Alice) hangs, turn 1 (Bob) succeeds
    let callCount = 0;
    tracedStreamTextMock.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return createHangingStream();
      // Second call is turn 1, third is share line
      return createStreamResult('Bob responds!', { inputTokens: 100, outputTokens: 50 });
    });

    const events: TurnEvent[] = [];
    const ctx = makeContext();
    const result = await executeBout(ctx, (e) => events.push(e));

    // Both turns should appear in transcript
    expect(result.transcript).toHaveLength(2);

    // Turn 0 should have the timeout fallback text
    expect(result.transcript[0]!.agentId).toBe('agent-a');
    expect(result.transcript[0]!.text).toBe('[Turn timed out - no response received]');

    // Turn 1 should have real content from Bob
    expect(result.transcript[1]!.agentId).toBe('agent-b');
    expect(result.transcript[1]!.text).toBe('Bob responds!');

    // An error SSE delta should have been emitted for the timed-out turn
    const timeoutDelta = events.find(
      (e) => e.type === 'text-delta' && e.delta.includes('[Turn timed out]'),
    );
    expect(timeoutDelta).toBeDefined();
  });

  // =========================================================================
  // Partial transcript on timeout
  // =========================================================================

  it('bout completes with partial transcript when one turn times out', async () => {
    // Turn 0 (Alice) yields partial text then times out
    // Turn 1 (Bob) succeeds normally
    let callCount = 0;
    tracedStreamTextMock.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return createSlowStream('I was saying');
      return createStreamResult('Bob finishes!', { inputTokens: 100, outputTokens: 50 });
    });

    const ctx = makeContext();
    const result = await executeBout(ctx);

    expect(result.transcript).toHaveLength(2);

    // Turn 0 should contain the partial text (not the fallback, since partial text exists)
    expect(result.transcript[0]!.agentId).toBe('agent-a');
    expect(result.transcript[0]!.text).toContain('I was saying');

    // Turn 1 should have Bob's complete response
    expect(result.transcript[1]!.agentId).toBe('agent-b');
    expect(result.transcript[1]!.text).toBe('Bob finishes!');
  });

  // =========================================================================
  // Share line timeout
  // =========================================================================

  it('share line timeout produces no shareLine without crashing', async () => {
    // Both turns succeed normally
    let callCount = 0;
    tracedStreamTextMock.mockImplementation(() => {
      callCount += 1;
      // Calls 1 and 2 are turn 0 and turn 1
      if (callCount <= 2) {
        return createStreamResult('Normal turn', { inputTokens: 100, outputTokens: 50 });
      }
      // Call 3 is the share line -- simulate timeout
      return {
        textStream: (async function* () {
          throw new Error('Stream timeout: totalMs exceeded 15000ms');
        })(),
        usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
        providerMetadata: Promise.resolve({}),
      };
    });

    const events: TurnEvent[] = [];
    const ctx = makeContext();
    const result = await executeBout(ctx, (e) => events.push(e));

    // Bout should complete successfully
    expect(result.transcript).toHaveLength(2);

    // Share line should be null (timeout fallback is empty string, trimmed to null)
    expect(result.shareLine).toBeNull();

    // No data-share-line event should have been emitted
    const shareEvent = events.find((e) => e.type === 'data-share-line');
    expect(shareEvent).toBeUndefined();
  });

  // =========================================================================
  // All turns timing out
  // =========================================================================

  it('all turns timing out still completes the bout gracefully', async () => {
    let callCount = 0;
    tracedStreamTextMock.mockImplementation(() => {
      callCount += 1;
      // Turns 1-4 all hang; the remaining call is the share line
      if (callCount <= 4) return createHangingStream();
      // Share line call -- return empty to keep it simple
      return createStreamResult('', { inputTokens: 10, outputTokens: 5 });
    });

    const events: TurnEvent[] = [];
    const ctx = makeContext({ preset: FOUR_TURN_PRESET });
    const result = await executeBout(ctx, (e) => events.push(e));

    // All 4 turns should appear in the transcript with fallback text
    expect(result.transcript).toHaveLength(4);
    for (const entry of result.transcript) {
      expect(entry.text).toBe('[Turn timed out - no response received]');
    }

    // Agent rotation should still be correct
    expect(result.transcript[0]!.agentId).toBe('agent-a');
    expect(result.transcript[1]!.agentId).toBe('agent-b');
    expect(result.transcript[2]!.agentId).toBe('agent-a');
    expect(result.transcript[3]!.agentId).toBe('agent-b');

    // Timeout deltas should have been emitted for each turn
    const timeoutDeltas = events.filter(
      (e) => e.type === 'text-delta' && e.delta.includes('[Turn timed out]'),
    );
    expect(timeoutDeltas).toHaveLength(4);

    // text-end events should still fire for each turn (cleanup after timeout)
    const textEnds = events.filter((e) => e.type === 'text-end');
    expect(textEnds).toHaveLength(4);
  });

  // =========================================================================
  // Non-timeout stream errors still propagate
  // =========================================================================

  it('non-timeout stream errors are re-thrown (not swallowed)', async () => {
    tracedStreamTextMock.mockImplementation(() => ({
      textStream: (async function* () {
        throw new Error('Internal server error');
      })(),
      usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
      providerMetadata: Promise.resolve({}),
    }));

    const ctx = makeContext();
    await expect(executeBout(ctx)).rejects.toThrow('Internal server error');
  });
});
