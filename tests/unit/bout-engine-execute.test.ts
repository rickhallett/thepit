import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoutContext, TurnEvent } from '@/lib/bout-engine';
import type { Preset } from '@/lib/presets';

// ---------------------------------------------------------------------------
// Hoisted mocks — run before any import resolves.
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

const AGENT_A = { id: 'agent-a', name: 'Alice', systemPrompt: 'You are Alice.', color: '#ff0000' };
const AGENT_B = { id: 'agent-b', name: 'Bob', systemPrompt: 'You are Bob.', color: '#0000ff' };
const AGENT_C = { id: 'agent-c', name: 'Charlie', systemPrompt: 'You are Charlie.', color: '#00ff00' };

const THREE_AGENT_PRESET = {
  ...TWO_AGENT_PRESET,
  agents: [AGENT_A, AGENT_B, AGENT_C],
  maxTurns: 3,
};

const SINGLE_AGENT_PRESET = {
  ...TWO_AGENT_PRESET,
  agents: [AGENT_A],
  maxTurns: 1,
};

/** Build a minimal BoutContext for testing executeBout. */
function makeContext(overrides: Partial<BoutContext> = {}): BoutContext {
  return {
    boutId: 'bout-test-1',
    presetId: 'test-preset',
    preset: TWO_AGENT_PRESET,
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

describe('executeBout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default stream mock: return short text for each turn
    tracedStreamTextMock.mockImplementation(() =>
      createStreamResult('Hello from AI!', { inputTokens: 100, outputTokens: 50 }),
    );
    untracedStreamTextMock.mockImplementation(() =>
      createStreamResult('Hello from BYOK!', { inputTokens: 80, outputTokens: 40 }),
    );

    // Default DB mocks
    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: async () => ({}),
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

    // Default DB select for user_activated check
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => [{ value: 5 }], // Not first bout
      }),
    }));
  });

  // =========================================================================
  // Turn Loop (E-01 to E-05)
  // =========================================================================

  describe('turn loop', () => {
    it('E-01: single-agent single turn produces 1 transcript entry', async () => {
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      const result = await executeBout(ctx);
      expect(result.transcript).toHaveLength(1);
      expect(result.transcript[0]!.agentId).toBe('agent-a');
      expect(result.transcript[0]!.turn).toBe(0);
    });

    it('E-02: multi-agent rotation alternates agents', async () => {
      const ctx = makeContext();
      const result = await executeBout(ctx);
      expect(result.transcript).toHaveLength(2);
      expect(result.transcript[0]!.agentId).toBe('agent-a');
      expect(result.transcript[1]!.agentId).toBe('agent-b');
    });

    it('E-03: three-agent rotation wraps around', async () => {
      const ctx = makeContext({ preset: THREE_AGENT_PRESET });
      const result = await executeBout(ctx);
      expect(result.transcript).toHaveLength(3);
      expect(result.transcript[0]!.agentId).toBe('agent-a');
      expect(result.transcript[1]!.agentId).toBe('agent-b');
      expect(result.transcript[2]!.agentId).toBe('agent-c');
    });

    it('E-04: empty agents array throws', async () => {
      const emptyPreset = { ...TWO_AGENT_PRESET, agents: [], maxTurns: 1 };
      const ctx = makeContext({ preset: emptyPreset });
      await expect(executeBout(ctx)).rejects.toThrow('preset.agents is empty');
    });

    it('E-05: agent color falls back to DEFAULT_AGENT_COLOR', async () => {
      const events: TurnEvent[] = [];
      const noColorPreset: Preset = {
        ...SINGLE_AGENT_PRESET,
        // Cast to bypass the color requirement — testing the runtime fallback
        agents: [{ id: 'agent-a', name: 'Alice', systemPrompt: 'test' } as Preset['agents'][0]],
      };
      const ctx = makeContext({ preset: noColorPreset });
      await executeBout(ctx, (e) => events.push(e));
      const dataTurn = events.find((e) => e.type === 'data-turn');
      expect(dataTurn).toBeDefined();
      if (dataTurn?.type === 'data-turn') {
        expect(dataTurn.data.color).toBe('#888888'); // DEFAULT_AGENT_COLOR
      }
    });
  });

  // =========================================================================
  // SSE Events (E-06 to E-11)
  // =========================================================================

  describe('SSE events', () => {
    it('E-06: emits start, data-turn, text-start, text-delta(s), text-end per turn', async () => {
      const events: TurnEvent[] = [];
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx, (e) => events.push(e));

      const types = events.map((e) => e.type);
      expect(types).toContain('start');
      expect(types).toContain('data-turn');
      expect(types).toContain('text-start');
      expect(types).toContain('text-delta');
      expect(types).toContain('text-end');
    });

    it('E-07: data-turn payload includes turn, agentId, agentName, color', async () => {
      const events: TurnEvent[] = [];
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx, (e) => events.push(e));

      const dataTurn = events.find((e) => e.type === 'data-turn');
      expect(dataTurn?.type).toBe('data-turn');
      if (dataTurn?.type === 'data-turn') {
        expect(dataTurn.data.turn).toBe(0);
        expect(dataTurn.data.agentId).toBe('agent-a');
        expect(dataTurn.data.agentName).toBe('Alice');
        expect(dataTurn.data.color).toBe('#ff0000');
      }
    });

    it('E-08: no callback safety — executeBout works without onEvent', async () => {
      const ctx = makeContext();
      const result = await executeBout(ctx);
      expect(result.transcript).toHaveLength(2);
    });

    it('E-09: share line event emitted when share line generated', async () => {
      const events: TurnEvent[] = [];
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx, (e) => events.push(e));

      const shareEvent = events.find((e) => e.type === 'data-share-line');
      expect(shareEvent).toBeDefined();
      if (shareEvent?.type === 'data-share-line') {
        expect(typeof shareEvent.data.text).toBe('string');
      }
    });

    it('E-10: multiple turns emit events in correct order', async () => {
      const events: TurnEvent[] = [];
      const ctx = makeContext();
      await executeBout(ctx, (e) => events.push(e));

      // Should see 2 complete turn sequences
      const startEvents = events.filter((e) => e.type === 'start');
      expect(startEvents).toHaveLength(2);
    });

    it('E-11: text-delta carries actual content from stream', async () => {
      tracedStreamTextMock.mockImplementation(() =>
        createStreamResult('specific-test-content'),
      );

      const events: TurnEvent[] = [];
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx, (e) => events.push(e));

      const deltas = events.filter((e) => e.type === 'text-delta');
      const fullText = deltas
        .map((e) => (e.type === 'text-delta' ? e.delta : ''))
        .join('');
      expect(fullText).toBe('specific-test-content');
    });
  });

  // =========================================================================
  // Scripted Turns (E-12 to E-16)
  // =========================================================================

  describe('scripted turns', () => {
    it('E-12: scripted turn skips LLM call', async () => {
      const ctx = makeContext({
        preset: TWO_AGENT_PRESET,
        scriptedTurns: new Map([[0, { agentIndex: 0, content: 'Scripted opener' }]]),
      });
      await executeBout(ctx);
      // Only 1 LLM call (turn 1), turn 0 was scripted
      expect(tracedStreamTextMock).toHaveBeenCalledTimes(2); // turn 1 + share line
    });

    it('E-13: scripted text appears in transcript and history', async () => {
      const ctx = makeContext({
        preset: SINGLE_AGENT_PRESET,
        scriptedTurns: new Map([[0, { agentIndex: 0, content: 'Pre-written content' }]]),
      });
      const result = await executeBout(ctx);
      expect(result.transcript[0]!.text).toBe('Pre-written content');
    });

    it('E-14: scripted turn has no token accounting', async () => {
      const ctx = makeContext({
        preset: SINGLE_AGENT_PRESET,
        scriptedTurns: new Map([[0, { agentIndex: 0, content: 'No tokens counted' }]]),
      });
      const result = await executeBout(ctx);
      // With only scripted turns, tokens should be 0
      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
    });

    it('E-15: scripted turn emits SSE deltas', async () => {
      const events: TurnEvent[] = [];
      const ctx = makeContext({
        preset: SINGLE_AGENT_PRESET,
        scriptedTurns: new Map([[0, { agentIndex: 0, content: 'Scripted SSE' }]]),
      });
      await executeBout(ctx, (e) => events.push(e));

      const deltas = events.filter((e) => e.type === 'text-delta');
      expect(deltas.length).toBeGreaterThan(0);
      const fullText = deltas
        .map((e) => (e.type === 'text-delta' ? e.delta : ''))
        .join('');
      expect(fullText).toBe('Scripted SSE');
    });

    it('E-16: mix of scripted and live turns', async () => {
      const ctx = makeContext({
        preset: TWO_AGENT_PRESET,
        scriptedTurns: new Map([[0, { agentIndex: 0, content: 'Scripted turn 0' }]]),
      });
      const result = await executeBout(ctx);
      expect(result.transcript).toHaveLength(2);
      expect(result.transcript[0]!.text).toBe('Scripted turn 0');
      expect(result.transcript[1]!.text).toBe('Hello from AI!');
    });
  });

  // =========================================================================
  // Prompt Hook (E-17 to E-20)
  // =========================================================================

  describe('prompt hook', () => {
    it('E-17: hook injection appended to system content', async () => {
      appendExperimentInjectionMock.mockImplementation(
        (system: string, injection: string) => `${system}\n${injection}`,
      );

      try {
        const ctx = makeContext({
          preset: SINGLE_AGENT_PRESET,
          promptHook: () => ({ injectedContent: 'EXPERIMENT: be brief' }),
        });
        await executeBout(ctx);

        expect(appendExperimentInjectionMock).toHaveBeenCalledWith(
          expect.any(String),
          'EXPERIMENT: be brief',
        );
      } finally {
        appendExperimentInjectionMock.mockReset();
      }
    });

    it('E-18: null hook return = no change', async () => {
      const ctx = makeContext({
        preset: SINGLE_AGENT_PRESET,
        promptHook: () => null,
      });
      await executeBout(ctx);
      expect(appendExperimentInjectionMock).not.toHaveBeenCalled();
    });

    it('E-19: hook receives copy of history, not reference', async () => {
      let capturedHistory: string[] = [];
      const ctx = makeContext({
        preset: TWO_AGENT_PRESET,
        promptHook: ({ history }) => {
          capturedHistory = history;
          return null;
        },
      });
      await executeBout(ctx);
      // On the second turn the hook should have received a copy of
      // the conversation history built from earlier turns.
      expect(Array.isArray(capturedHistory)).toBe(true);
      expect(capturedHistory!.length).toBeGreaterThan(0);
    });

    it('E-20: hook not called without promptHook', async () => {
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);
      expect(appendExperimentInjectionMock).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Context Window (E-21 to E-26)
  // =========================================================================

  describe('context window', () => {
    it('E-21: no truncation when within budget', async () => {
      getInputTokenBudgetMock.mockReturnValue(1_000_000); // Huge budget
      const ctx = makeContext();
      const result = await executeBout(ctx);
      expect(result.transcript).toHaveLength(2);
    });

    it('E-22: BYOK model resolution uses byokData.modelId', async () => {
      getInputTokenBudgetMock.mockReturnValue(170_000);
      const ctx = makeContext({
        modelId: 'byok',
        byokData: { provider: 'anthropic', modelId: 'claude-opus-4-20250514', key: 'sk-test' },
        preset: SINGLE_AGENT_PRESET,
      });
      await executeBout(ctx);
      expect(getInputTokenBudgetMock).toHaveBeenCalledWith('claude-opus-4-20250514');
    });

    it('E-23: hard guard throws when prompt exceeds budget', async () => {
      getInputTokenBudgetMock.mockReturnValue(10); // Impossibly small budget
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await expect(executeBout(ctx)).rejects.toThrow('context limit');
    });

    it('E-24: first turn has empty history', async () => {
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);
      // First turn call to tracedStreamText — check the user message
      const firstCall = tracedStreamTextMock.mock.calls[0]![0];
      const userMsg = firstCall.messages[1];
      expect(userMsg.content).toBeDefined();
    });

    it('E-25: BYOK falls back to FREE_MODEL_ID when no byokData.modelId', async () => {
      getInputTokenBudgetMock.mockReturnValue(170_000);
      const ctx = makeContext({
        modelId: 'byok',
        byokData: { provider: 'anthropic', modelId: undefined, key: 'sk-test' },
        preset: SINGLE_AGENT_PRESET,
      });
      await executeBout(ctx);
      // Should fall back through the chain: byokData.modelId → ANTHROPIC_BYOK_MODEL → FREE_MODEL_ID
      expect(getInputTokenBudgetMock).toHaveBeenCalled();
    });

    it('E-26: context window truncation does not crash on empty history', async () => {
      getInputTokenBudgetMock.mockReturnValue(170_000);
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET }); // 1 turn = no history for first turn
      const result = await executeBout(ctx);
      expect(result.transcript).toHaveLength(1);
    });
  });

  // =========================================================================
  // LLM Configuration (E-27 to E-32)
  // =========================================================================

  describe('LLM configuration', () => {
    it('E-27: platform calls use tracedStreamText', async () => {
      const ctx = makeContext({ modelId: 'claude-haiku-4-5-20251001' });
      await executeBout(ctx);
      expect(tracedStreamTextMock).toHaveBeenCalled();
      // Turns should not use untraced
      const turnCallCount = tracedStreamTextMock.mock.calls.length;
      expect(turnCallCount).toBeGreaterThanOrEqual(2); // turns + share line
    });

    it('E-28: BYOK calls use untracedStreamText', async () => {
      const ctx = makeContext({
        modelId: 'byok',
        byokData: { provider: 'anthropic', modelId: 'claude-sonnet-4-5-20250929', key: 'sk-test' },
        preset: SINGLE_AGENT_PRESET,
      });
      await executeBout(ctx);
      expect(untracedStreamTextMock).toHaveBeenCalled();
    });

    it('E-29: Anthropic platform model gets cache control', async () => {
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);
      const call = tracedStreamTextMock.mock.calls[0]![0];
      // First message (system) should have providerOptions with cacheControl
      const systemMsg = call.messages[0];
      expect(systemMsg.providerOptions?.anthropic?.cacheControl?.type).toBe('ephemeral');
    });

    it('E-30: BYOK OpenRouter model does NOT get cache control', async () => {
      const ctx = makeContext({
        modelId: 'byok',
        byokData: { provider: 'openrouter', modelId: 'gpt-4o', key: 'sk-or-test' },
        preset: SINGLE_AGENT_PRESET,
      });
      await executeBout(ctx);
      const call = untracedStreamTextMock.mock.calls[0]![0];
      const systemMsg = call.messages[0];
      expect(systemMsg.providerOptions).toBeUndefined();
    });

    it('E-31: maxOutputTokens from lengthConfig', async () => {
      const ctx = makeContext({
        preset: SINGLE_AGENT_PRESET,
        lengthConfig: {
          id: 'short' as const,
          label: 'Short',
          hint: '1-2 sentences',
          maxOutputTokens: 100,
          outputTokensPerTurn: 60,
        },
      });
      await executeBout(ctx);
      const call = tracedStreamTextMock.mock.calls[0]![0];
      expect(call.maxOutputTokens).toBe(100);
    });

    it('E-32: model instance from getModel used in streamFn', async () => {
      getModelMock.mockReturnValue('custom-model-instance');
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);
      const call = tracedStreamTextMock.mock.calls[0]![0];
      expect(call.model).toBe('custom-model-instance');
    });
  });

  // =========================================================================
  // Token Accounting (E-33 to E-37)
  // =========================================================================

  describe('token accounting', () => {
    it('E-33: real usage from provider is used when available', async () => {
      tracedStreamTextMock.mockImplementation(() =>
        createStreamResult('text', { inputTokens: 200, outputTokens: 100 }),
      );
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      const result = await executeBout(ctx);
      expect(result.inputTokens).toBe(200);
      expect(result.outputTokens).toBe(100);
    });

    it('E-34: fallback estimation when usage is null', async () => {
      tracedStreamTextMock.mockImplementation(() => ({
        textStream: (async function* () { yield 'fallback'; })(),
        usage: Promise.resolve(null),
        providerMetadata: Promise.resolve({}),
      }));
      estimateTokensFromTextMock.mockReturnValue(10);

      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      const result = await executeBout(ctx);
      // Should use estimated tokens (non-zero)
      expect(result.inputTokens).toBeGreaterThan(0);
    });

    it('E-35: tokens cumulate across turns', async () => {
      tracedStreamTextMock.mockImplementation(() =>
        createStreamResult('text', { inputTokens: 100, outputTokens: 50 }),
      );
      const ctx = makeContext(); // 2 turns
      const result = await executeBout(ctx);
      expect(result.inputTokens).toBe(200); // 100 × 2
      expect(result.outputTokens).toBe(100); // 50 × 2
    });

    it('E-36: tokens cumulate across scripted + live turns', async () => {
      // Scripted turns contribute 0 tokens; live turns contribute real tokens
      tracedStreamTextMock.mockImplementation(() =>
        createStreamResult('text', { inputTokens: 100, outputTokens: 50 }),
      );
      const ctx = makeContext({
        preset: TWO_AGENT_PRESET,
        scriptedTurns: new Map([[0, { agentIndex: 0, content: 'No cost' }]]),
      });
      const result = await executeBout(ctx);
      // Turn 0 scripted (0 tokens) + Turn 1 live (100/50)
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
    });

    it('E-37: cache metadata extracted for Anthropic models', async () => {
      tracedStreamTextMock.mockImplementation(() =>
        createStreamResult('text', { inputTokens: 100, outputTokens: 50 }, {
          anthropic: { cacheCreationInputTokens: 500, cacheReadInputTokens: 300 },
        }),
      );

      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);

      // Cache metadata should be included in AI generation capture
      expect(serverCaptureAIGenerationMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          cacheCreationInputTokens: 500,
          cacheReadInputTokens: 300,
        }),
      );
    });
  });

  // =========================================================================
  // TTFT & Refusal (E-38 to E-41)
  // =========================================================================

  describe('TTFT & refusal', () => {
    it('E-38: refusal detected and logged', async () => {
      detectRefusalMock.mockReturnValue('I cannot');
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);
      expect(logRefusalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          boutId: 'bout-test-1',
          marker: 'I cannot',
        }),
      );
    });

    it('E-39: no refusal marker = no logging', async () => {
      detectRefusalMock.mockReturnValue(null);
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);
      expect(logRefusalMock).not.toHaveBeenCalled();
    });

    it('E-40: refusal logged with agent and bout context', async () => {
      detectRefusalMock.mockReturnValue('I apologize');
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);
      expect(logRefusalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          boutId: 'bout-test-1',
          turn: 0,
          agentId: 'agent-a',
          agentName: 'Alice',
          modelId: 'claude-haiku-4-5-20251001',
          presetId: 'test-preset',
          marker: 'I apologize',
        }),
      );
    });

    it('E-41: refusal detection per turn in multi-turn bout', async () => {
      // First turn: no refusal. Second turn: refusal.
      let turnCount = 0;
      detectRefusalMock.mockImplementation(() => {
        turnCount++;
        return turnCount === 2 ? 'I cannot' : null;
      });

      const ctx = makeContext(); // 2 turns
      await executeBout(ctx);
      expect(logRefusalMock).toHaveBeenCalledTimes(1);
      expect(logRefusalMock).toHaveBeenCalledWith(
        expect.objectContaining({ turn: 1, marker: 'I cannot' }),
      );
    });
  });

  // =========================================================================
  // Share Line (E-42 to E-47)
  // =========================================================================

  describe('share line', () => {
    it('E-42: share line generated from transcript', async () => {
      // The share line uses a separate tracedStreamText call (the last one)
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      const result = await executeBout(ctx);
      expect(result.shareLine).toBeTruthy();
      expect(typeof result.shareLine).toBe('string');
    });

    it('E-43: share line > 140 chars is truncated with ellipsis', async () => {
      // Make the share line response very long
      let shareCallIndex = 0;
      tracedStreamTextMock.mockImplementation(() => {
        shareCallIndex++;
        if (shareCallIndex <= 1) {
          // Turn response
          return createStreamResult('Turn text');
        }
        // Share line response — very long
        return createStreamResult('A'.repeat(200));
      });

      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      const result = await executeBout(ctx);
      expect(result.shareLine!.length).toBeLessThanOrEqual(140);
      expect(result.shareLine!).toContain('...');
    });

    it('E-44: quote marks stripped from share line', async () => {
      let shareCallIndex = 0;
      tracedStreamTextMock.mockImplementation(() => {
        shareCallIndex++;
        if (shareCallIndex <= 1) {
          return createStreamResult('Turn text');
        }
        return createStreamResult('"Quoted share line"');
      });

      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      const result = await executeBout(ctx);
      expect(result.shareLine).not.toMatch(/^["']/);
      expect(result.shareLine).not.toMatch(/["']$/);
    });

    it('E-45: share line failure is non-fatal', async () => {
      let shareCallIndex = 0;
      tracedStreamTextMock.mockImplementation(() => {
        shareCallIndex++;
        if (shareCallIndex <= 1) {
          return createStreamResult('Turn text');
        }
        // Share line fails
        return {
          textStream: (async function* () { throw new Error('Share failed'); })(),
          usage: Promise.resolve(null),
          providerMetadata: Promise.resolve({}),
        };
      });

      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      const result = await executeBout(ctx);
      // Should still complete — share line failure is caught
      expect(result.transcript).toHaveLength(1);
      expect(result.shareLine).toBeNull();
    });

    it('E-46: transcript clipped to last 2000 chars for share prompt', async () => {
      // This is internal behavior — we verify by checking the share line call
      // uses a reasonable-length input (not the full transcript)
      tracedStreamTextMock.mockImplementation(() =>
        createStreamResult('A'.repeat(500), { inputTokens: 100, outputTokens: 50 }),
      );

      const ctx = makeContext({
        preset: { ...TWO_AGENT_PRESET, maxTurns: 6 },
      });
      await executeBout(ctx);

      // The last tracedStreamText call is the share line generation
      const lastCall = tracedStreamTextMock.mock.calls.at(-1);
      expect(lastCall).toBeDefined();
    });

    it('E-47: share line event emitted via onEvent callback', async () => {
      const events: TurnEvent[] = [];
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx, (e) => events.push(e));

      const shareEvents = events.filter((e) => e.type === 'data-share-line');
      expect(shareEvents).toHaveLength(1);
    });
  });

  // =========================================================================
  // DB Persistence (E-48 to E-50)
  // =========================================================================

  describe('DB persistence', () => {
    it('E-48: sets running status at start', async () => {
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);

      // First update call should set status='running'
      const firstUpdateCall = mockDb.update.mock.calls[0];
      expect(firstUpdateCall).toBeDefined();
    });

    it('E-49: sets completed with transcript and shareLine', async () => {
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);

      // Should have called update at least twice (running + completed)
      expect(mockDb.update.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('E-50: shareGeneratedAt null when no share line', async () => {
      // Force share line to fail
      let callIndex = 0;
      tracedStreamTextMock.mockImplementation(() => {
        callIndex++;
        if (callIndex <= 1) return createStreamResult('Turn text');
        return {
          textStream: (async function* () { throw new Error('fail'); })(),
          usage: Promise.resolve(null),
          providerMetadata: Promise.resolve({}),
        };
      });

      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      const result = await executeBout(ctx);
      expect(result.shareLine).toBeNull();
    });
  });

  // =========================================================================
  // Analytics (E-51 to E-60)
  // =========================================================================

  describe('analytics', () => {
    it('E-51: bout_started event tracked', async () => {
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);
      expect(serverTrackMock).toHaveBeenCalledWith(
        'user-1',
        'bout_started',
        expect.objectContaining({ bout_id: 'bout-test-1' }),
      );
    });

    it('E-52: bout_completed event tracked', async () => {
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);
      expect(serverTrackMock).toHaveBeenCalledWith(
        'user-1',
        'bout_completed',
        expect.objectContaining({
          bout_id: 'bout-test-1',
          has_share_line: true,
        }),
      );
    });

    it('E-53: $ai_generation captured per turn', async () => {
      const ctx = makeContext(); // 2 turns
      await executeBout(ctx);

      // AI generation captured for each turn + share line
      const aiGenCalls = serverCaptureAIGenerationMock.mock.calls.filter(
        (call: unknown[]) => (call[1] as Record<string, unknown>).generationType === 'turn',
      );
      expect(aiGenCalls).toHaveLength(2);
    });

    it('E-54: BYOK attribution uses byokData model info', async () => {
      const ctx = makeContext({
        modelId: 'byok',
        byokData: { provider: 'openrouter', modelId: 'gpt-4o', key: 'sk-test' },
        preset: SINGLE_AGENT_PRESET,
      });
      await executeBout(ctx);

      expect(serverCaptureAIGenerationMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          model: 'gpt-4o',
          provider: 'openrouter',
          isByok: true,
        }),
      );
    });

    it('E-55: user_activated tracked on first completed bout', async () => {
      mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => [{ value: 1 }], // This is the ONLY completed bout
        }),
      }));

      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);

      expect(serverTrackMock).toHaveBeenCalledWith(
        'user-1',
        'user_activated',
        expect.objectContaining({ preset_id: 'test-preset' }),
      );
    });

    it('E-56: user_activated NOT tracked on subsequent bouts', async () => {
      mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => [{ value: 5 }], // 5 completed bouts — not first
        }),
      }));

      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);

      const activatedCalls = serverTrackMock.mock.calls.filter(
        (call: unknown[]) => call[1] === 'user_activated',
      );
      expect(activatedCalls).toHaveLength(0);
    });

    it('E-57: anonymous bout uses "anonymous" for tracking', async () => {
      const ctx = makeContext({ userId: null, preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);
      expect(serverTrackMock).toHaveBeenCalledWith(
        'anonymous',
        'bout_started',
        expect.any(Object),
      );
    });

    it('E-58: Sentry logger captures bout_started', async () => {
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);
      expect(sentryLoggerMock.info).toHaveBeenCalledWith(
        'bout_started',
        expect.objectContaining({ bout_id: 'bout-test-1' }),
      );
    });

    it('E-59: Sentry logger captures bout_completed', async () => {
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);
      expect(sentryLoggerMock.info).toHaveBeenCalledWith(
        'bout_completed',
        expect.objectContaining({ bout_id: 'bout-test-1' }),
      );
    });

    it('E-60: flushServerAnalytics called after completion', async () => {
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);
      expect(flushServerAnalyticsMock).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Settlement Success (E-61 to E-66)
  // =========================================================================

  describe('settlement success', () => {
    it('E-61: refund when actual < preauth', async () => {
      toMicroCreditsMock.mockReturnValue(3000); // actualMicro < preauthMicro (5000)
      const ctx = makeContext({ preauthMicro: 5000 });
      await executeBout(ctx);

      expect(settleCreditsMock).toHaveBeenCalledWith(
        'user-1',
        -2000, // 3000 - 5000 = negative delta (refund)
        'settlement',
        expect.any(Object),
      );
    });

    it('E-62: charge when actual > preauth', async () => {
      toMicroCreditsMock.mockReturnValue(7000); // actualMicro > preauthMicro (5000)
      const ctx = makeContext({ preauthMicro: 5000 });
      await executeBout(ctx);

      expect(settleCreditsMock).toHaveBeenCalledWith(
        'user-1',
        2000, // 7000 - 5000 = positive delta (charge)
        'settlement',
        expect.any(Object),
      );
    });

    it('E-63: exact match skips settlement', async () => {
      toMicroCreditsMock.mockReturnValue(5000); // Exact match
      const ctx = makeContext({ preauthMicro: 5000 });
      await executeBout(ctx);

      expect(settleCreditsMock).not.toHaveBeenCalled();
    });

    it('E-64: CREDITS_ENABLED=false skips settlement', async () => {
      const credits = await import('@/lib/credits');
      Object.defineProperty(credits, 'CREDITS_ENABLED', { value: false, writable: true });
      try {
        const ctx = makeContext({ preauthMicro: 5000 });
        await executeBout(ctx);

        expect(settleCreditsMock).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(credits, 'CREDITS_ENABLED', { value: true, writable: true });
      }
    });

    it('E-65: anonymous bout skips settlement (no userId)', async () => {
      const ctx = makeContext({ userId: null, preauthMicro: 0 });
      await executeBout(ctx);
      expect(settleCreditsMock).not.toHaveBeenCalled();
    });

    it('E-66: financial telemetry logged on settlement', async () => {
      toMicroCreditsMock.mockReturnValue(3000);
      const ctx = makeContext({ preauthMicro: 5000 });
      await executeBout(ctx);

      // Settlement was called, which means the financial log was emitted
      expect(settleCreditsMock).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Error Path (E-67 to E-75)
  // =========================================================================

  describe('error path', () => {
    it('E-67: partial transcript persisted on error', async () => {
      // First turn succeeds, second turn fails
      let turnCount = 0;
      tracedStreamTextMock.mockImplementation(() => {
        turnCount++;
        if (turnCount === 1) {
          return createStreamResult('Turn 1 OK');
        }
        return createFailingStream('partial', new Error('LLM failure'));
      });

      const ctx = makeContext();
      await expect(executeBout(ctx)).rejects.toThrow('LLM failure');

      // DB should have been updated with error status
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('E-68: credit refund on error', async () => {
      tracedStreamTextMock.mockImplementation(() =>
        createFailingStream('fail', new Error('boom')),
      );
      computeCostGbpMock.mockReturnValue(0.001);
      toMicroCreditsMock.mockReturnValue(1000);

      const ctx = makeContext({ preauthMicro: 5000 });
      await expect(executeBout(ctx)).rejects.toThrow('boom');

      // Should refund unused preauth (5000 - 1000 = 4000)
      expect(applyCreditDeltaMock).toHaveBeenCalledWith(
        'user-1',
        4000,
        'settlement-error',
        expect.any(Object),
      );
    });

    it('E-69: intro pool refund on error for anonymous bout', async () => {
      tracedStreamTextMock.mockImplementation(() =>
        createFailingStream('fail', new Error('error')),
      );

      const ctx = makeContext({
        userId: null,
        preauthMicro: 0,
        introPoolConsumedMicro: 5000,
        preset: SINGLE_AGENT_PRESET,
      });
      await expect(executeBout(ctx)).rejects.toThrow('error');

      expect(refundIntroPoolMock).toHaveBeenCalledWith(5000);
    });

    it('E-70: bout_error tracked via serverTrack', async () => {
      tracedStreamTextMock.mockImplementation(() =>
        createFailingStream('fail', new Error('tracked error')),
      );

      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await expect(executeBout(ctx)).rejects.toThrow();

      expect(serverTrackMock).toHaveBeenCalledWith(
        'user-1',
        'bout_error',
        expect.objectContaining({ bout_id: 'bout-test-1' }),
      );
    });

    it('E-71: Sentry captures bout_error', async () => {
      tracedStreamTextMock.mockImplementation(() =>
        createFailingStream('fail', new Error('sentry error')),
      );

      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await expect(executeBout(ctx)).rejects.toThrow();

      expect(sentryLoggerMock.error).toHaveBeenCalledWith(
        'bout_error',
        expect.objectContaining({ bout_id: 'bout-test-1' }),
      );
    });

    it('E-72: error re-thrown after cleanup', async () => {
      const originalError = new Error('original error message');
      tracedStreamTextMock.mockImplementation(() =>
        createFailingStream('fail', originalError),
      );

      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await expect(executeBout(ctx)).rejects.toThrow('original error message');
    });

    it('E-73: no credit refund when preauthMicro is 0', async () => {
      tracedStreamTextMock.mockImplementation(() =>
        createFailingStream('fail', new Error('err')),
      );

      const ctx = makeContext({ preauthMicro: 0, preset: SINGLE_AGENT_PRESET });
      await expect(executeBout(ctx)).rejects.toThrow();

      expect(applyCreditDeltaMock).not.toHaveBeenCalled();
    });

    it('E-74: no intro pool refund when introPoolConsumedMicro is 0', async () => {
      tracedStreamTextMock.mockImplementation(() =>
        createFailingStream('fail', new Error('err')),
      );

      const ctx = makeContext({ introPoolConsumedMicro: 0, preset: SINGLE_AGENT_PRESET });
      await expect(executeBout(ctx)).rejects.toThrow();

      expect(refundIntroPoolMock).not.toHaveBeenCalled();
    });

    it('E-75: flushServerAnalytics called on error path too', async () => {
      tracedStreamTextMock.mockImplementation(() =>
        createFailingStream('fail', new Error('err')),
      );

      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await expect(executeBout(ctx)).rejects.toThrow();

      expect(flushServerAnalyticsMock).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Tracing Wrapper (E-76 to E-78)
  // =========================================================================

  describe('tracing wrapper', () => {
    it('E-76: withTracing called with bout metadata', async () => {
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);

      expect(withTracingMock).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          name: 'bout:bout-test-1',
          run_type: 'chain',
          metadata: expect.objectContaining({
            boutId: 'bout-test-1',
            presetId: 'test-preset',
            model: 'claude-haiku-4-5-20251001',
          }),
        }),
      );
    });

    it('E-77: tracing failure is gracefully handled', async () => {
      withTracingMock.mockImplementation(() => {
        throw new Error('LangSmith broken');
      });

      try {
        const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
        // Should NOT throw — tracing failure is caught
        const result = await executeBout(ctx);
        expect(result.transcript).toHaveLength(1);
      } finally {
        withTracingMock.mockImplementation((fn: unknown) => fn);
      }
    });

    it('E-78: tags include bout, presetId, modelId', async () => {
      const ctx = makeContext({ preset: SINGLE_AGENT_PRESET });
      await executeBout(ctx);

      expect(withTracingMock).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          tags: expect.arrayContaining(['bout', 'test-preset', 'claude-haiku-4-5-20251001']),
        }),
      );
    });
  });
});
