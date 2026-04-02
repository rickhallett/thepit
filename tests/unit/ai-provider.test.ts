import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@openrouter/ai-sdk-provider', () => {
  const chatMock = vi.fn((modelId: string) => ({ modelId, provider: 'openrouter' }));
  return {
    createOpenRouter: vi.fn(({ apiKey }: { apiKey: string }) => ({
      chat: chatMock,
      _apiKey: apiKey,
    })),
  };
});

vi.mock('@/lib/env', () => ({
  env: { OPENROUTER_API_KEY: 'sk-or-v1-platform-test-key' },
}));

// Must also mock model-registry since it may be imported
vi.mock('@/lib/model-registry', () => ({
  getInputTokenBudget: vi.fn((modelId: string) => 100_000),
  DEFAULT_FREE_MODEL: 'openai/gpt-4o-mini',
  CONTEXT_SAFETY_MARGIN: 0.15,
}));

describe('getModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns platform-funded model without apiKey', async () => {
    const { getModel } = await import('@/lib/ai');
    const model = getModel('openai/gpt-4o-mini');
    expect(model).toBeDefined();
    expect((model as any).modelId).toBe('openai/gpt-4o-mini');
  });

  it('creates new OpenRouter instance for BYOK', async () => {
    const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');
    const { getModel } = await import('@/lib/ai');
    getModel('openai/gpt-4o', 'sk-or-v1-user-key');
    // Should have been called twice: once for platform (module init), once for BYOK
    expect(createOpenRouter).toHaveBeenCalledWith({ apiKey: 'sk-or-v1-user-key' });
  });
});

describe('isAnthropicModel', () => {
  it('returns true for anthropic/ prefix', async () => {
    const { isAnthropicModel } = await import('@/lib/ai');
    expect(isAnthropicModel('anthropic/claude-sonnet-4-6')).toBe(true);
    expect(isAnthropicModel('anthropic/claude-haiku-4')).toBe(true);
  });

  it('returns false for non-anthropic models', async () => {
    const { isAnthropicModel } = await import('@/lib/ai');
    expect(isAnthropicModel('openai/gpt-4o')).toBe(false);
    expect(isAnthropicModel('deepseek/deepseek-r1')).toBe(false);
  });
});

describe('re-exports', () => {
  it('re-exports getInputTokenBudget from model-registry', async () => {
    const { getInputTokenBudget } = await import('@/lib/ai');
    expect(getInputTokenBudget).toBeDefined();
    expect(typeof getInputTokenBudget).toBe('function');
  });

  it('re-exports DEFAULT_FREE_MODEL from model-registry', async () => {
    const { DEFAULT_FREE_MODEL } = await import('@/lib/ai');
    expect(DEFAULT_FREE_MODEL).toBe('openai/gpt-4o-mini');
  });
});
