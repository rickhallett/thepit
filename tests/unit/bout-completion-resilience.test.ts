import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoutContext } from '@/lib/bout-engine';

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

const SINGLE_AGENT_PRESET = {
  id: 'test-preset',
  name: 'Test Preset',
  agents: [
    { id: 'agent-a', name: 'Alice', systemPrompt: 'You are Alice.', color: '#ff0000' },
  ],
  maxTurns: 1,
  tier: 'free' as const,
};

function makeContext(overrides: Partial<BoutContext> = {}): BoutContext {
  return {
    boutId: 'bout-test-1',
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

/**
 * Track how many times mockDb.update is called and what the chained
 * .set() receives. Returns a controller to configure per-call behaviour.
 *
 * The DB mock chain is: db.update(table) -> .set(fields) -> .where(clause) -> result
 * We need to intercept the .where() call to throw on specific invocations,
 * while allowing other update calls (e.g. status='running') to succeed.
 */
function setupCompletionUpdateMock() {
  let updateCallCount = 0;
  const completionFailures: number[] = []; // which completion-update calls should fail

  // Track which call index each update corresponds to
  const setCalls: Array<{ fields: Record<string, unknown>; callIndex: number }> = [];

  mockDb.update.mockImplementation(() => ({
    set: (fields: Record<string, unknown>) => {
      updateCallCount++;
      const callIndex = updateCallCount;
      setCalls.push({ fields, callIndex });

      return {
        where: async () => {
          // Only fail if this is a completion write (status='completed')
          // and it's in the failure list
          if (fields.status === 'completed') {
            const completionCallIndex = setCalls.filter(c => c.fields.status === 'completed').length;
            if (completionFailures.includes(completionCallIndex)) {
              throw new Error(`DB connection lost (attempt ${completionCallIndex})`);
            }
          }
          return {};
        },
      };
    },
  }));

  return {
    /** Mark the Nth completion-update call (1-indexed) as failing */
    failCompletionAttempt(...attempts: number[]) {
      completionFailures.push(...attempts);
    },
    setCalls,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('bout completion resilience', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    tracedStreamTextMock.mockImplementation(() =>
      createStreamResult('Hello from AI!', { inputTokens: 100, outputTokens: 50 }),
    );
    untracedStreamTextMock.mockImplementation(() =>
      createStreamResult('Hello from BYOK!', { inputTokens: 80, outputTokens: 40 }),
    );

    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: async () => ({}),
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

  afterEach(() => {
    vi.useRealTimers();
  });

  // R-01: Sentry receives transcript data when completion UPDATE fails
  it('R-01: logs transcript to Sentry when completion UPDATE throws', async () => {
    const ctrl = setupCompletionUpdateMock();
    ctrl.failCompletionAttempt(1, 2); // Both attempts fail

    const ctx = makeContext();
    await expect(executeBout(ctx)).rejects.toThrow();

    // First failure should log to Sentry with transcript_data
    expect(sentryLoggerMock.error).toHaveBeenCalledWith(
      'bout_completion_write_failed',
      expect.objectContaining({
        bout_id: 'bout-test-1',
        transcript_data: expect.any(String),
        attempt: 1,
      }),
    );

    // Verify the transcript data is parseable JSON containing the transcript
    const firstCall = sentryLoggerMock.error.mock.calls.find(
      (call: unknown[]) => call[0] === 'bout_completion_write_failed',
    );
    expect(firstCall).toBeDefined();
    const transcriptJson = (firstCall![1] as Record<string, unknown>).transcript_data as string;
    const parsed = JSON.parse(transcriptJson);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1); // Single agent, single turn
  });

  // R-02: Retry succeeds after transient failure
  it('R-02: completes successfully when UPDATE fails once then succeeds on retry', async () => {
    const ctrl = setupCompletionUpdateMock();
    ctrl.failCompletionAttempt(1); // Only first attempt fails

    const ctx = makeContext();
    const result = await executeBout(ctx);

    // Bout should complete successfully
    expect(result.transcript).toHaveLength(1);
    expect(result.transcript[0]!.agentId).toBe('agent-a');

    // First failure logged to Sentry
    expect(sentryLoggerMock.error).toHaveBeenCalledWith(
      'bout_completion_write_failed',
      expect.objectContaining({
        bout_id: 'bout-test-1',
        attempt: 1,
      }),
    );

    // The outer bout_error should NOT be called (retry succeeded)
    const outerErrorCalls = sentryLoggerMock.error.mock.calls.filter(
      (call: unknown[]) => call[0] === 'bout_error',
    );
    expect(outerErrorCalls).toHaveLength(0);
  });

  // R-03: Double failure propagates to outer error handler
  it('R-03: propagates to outer catch when both attempts fail', async () => {
    const ctrl = setupCompletionUpdateMock();
    ctrl.failCompletionAttempt(1, 2); // Both attempts fail

    const ctx = makeContext();
    await expect(executeBout(ctx)).rejects.toThrow('DB connection lost (attempt 2)');

    // Both attempts logged
    expect(sentryLoggerMock.error).toHaveBeenCalledWith(
      'bout_completion_write_failed',
      expect.objectContaining({ attempt: 1 }),
    );
    expect(sentryLoggerMock.error).toHaveBeenCalledWith(
      'bout_completion_write_failed_final',
      expect.objectContaining({ attempt: 2 }),
    );

    // Outer error handler also fires (bout_error from the outer catch)
    expect(sentryLoggerMock.error).toHaveBeenCalledWith(
      'bout_error',
      expect.objectContaining({ bout_id: 'bout-test-1' }),
    );
  });

  // R-04: Structured log includes all required context fields
  it('R-04: Sentry structured log includes boutId, presetId, modelId, transcript length, tokens', async () => {
    const ctrl = setupCompletionUpdateMock();
    ctrl.failCompletionAttempt(1, 2);

    const ctx = makeContext();
    await expect(executeBout(ctx)).rejects.toThrow();

    expect(sentryLoggerMock.error).toHaveBeenCalledWith(
      'bout_completion_write_failed',
      expect.objectContaining({
        bout_id: 'bout-test-1',
        preset_id: 'test-preset',
        model_id: 'claude-haiku-4-5-20251001',
        transcript_length: 1,
        input_tokens: 100,
        output_tokens: 50,
        has_share_line: true,
        error_message: expect.stringContaining('DB connection lost'),
      }),
    );
  });

  // R-05: Error path credit refund still works after double failure
  it('R-05: outer catch refunds credits after completion write double failure', async () => {
    const ctrl = setupCompletionUpdateMock();
    ctrl.failCompletionAttempt(1, 2);

    computeCostGbpMock.mockReturnValue(0.001);
    toMicroCreditsMock.mockReturnValue(1000);

    const ctx = makeContext({ preauthMicro: 5000 });
    await expect(executeBout(ctx)).rejects.toThrow();

    // Outer catch should refund unused preauth (5000 - 1000 = 4000)
    expect(applyCreditDeltaMock).toHaveBeenCalledWith(
      'user-1',
      4000,
      'settlement-error',
      expect.any(Object),
    );
  });

  // R-06: Normal completion path unaffected by the try/catch wrapper
  it('R-06: normal completion works when DB write succeeds first time', async () => {
    // Default mock - no failures
    const ctx = makeContext();
    const result = await executeBout(ctx);

    expect(result.transcript).toHaveLength(1);
    expect(result.shareLine).toBeTruthy();

    // No error logging should have occurred
    const completionErrorCalls = sentryLoggerMock.error.mock.calls.filter(
      (call: unknown[]) =>
        call[0] === 'bout_completion_write_failed' ||
        call[0] === 'bout_completion_write_failed_final',
    );
    expect(completionErrorCalls).toHaveLength(0);
  });
});
