import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MODEL_IDS, OPENROUTER_MODELS } from '@/lib/models';

const mockOrChat = vi.fn((modelId: string) => ({ modelId, provider: 'openrouter' }));

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => vi.fn((modelId: string) => ({ modelId }))),
}));

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => ({
    chat: mockOrChat,
  })),
}));

describe('lib/ai', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.ANTHROPIC_FREE_MODEL;
    delete process.env.ANTHROPIC_MODEL;
    delete process.env.ANTHROPIC_PREMIUM_MODELS;
    delete process.env.ANTHROPIC_PREMIUM_MODEL;
    delete process.env.ANTHROPIC_BYOK_MODEL;
  });

  it('FREE_MODEL_ID defaults to haiku model', async () => {
    const { FREE_MODEL_ID } = await import('@/lib/ai');
    expect(FREE_MODEL_ID).toBe(MODEL_IDS.HAIKU);
  });

  it('PREMIUM_MODEL_OPTIONS is an array of model IDs', async () => {
    const { PREMIUM_MODEL_OPTIONS } = await import('@/lib/ai');
    expect(Array.isArray(PREMIUM_MODEL_OPTIONS)).toBe(true);
    expect(PREMIUM_MODEL_OPTIONS.length).toBeGreaterThan(0);
    PREMIUM_MODEL_OPTIONS.forEach((id) => {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  it('DEFAULT_PREMIUM_MODEL_ID is the first premium option', async () => {
    const { DEFAULT_PREMIUM_MODEL_ID, PREMIUM_MODEL_OPTIONS } =
      await import('@/lib/ai');
    expect(DEFAULT_PREMIUM_MODEL_ID).toBe(PREMIUM_MODEL_OPTIONS[0]);
  });

  it('getModel returns provider for default model', async () => {
    const { getModel, FREE_MODEL_ID } = await import('@/lib/ai');
    const model = getModel();
    expect(model).toEqual({ modelId: FREE_MODEL_ID });
  });

  it('getModel with BYOK uses BYOK_MODEL_ID', async () => {
    const { getModel, BYOK_MODEL_ID } = await import('@/lib/ai');
    const model = getModel('byok');
    expect(model).toEqual({ modelId: BYOK_MODEL_ID });
  });

  it('getModel with Anthropic apiKey creates new Anthropic provider', async () => {
    const { createAnthropic } = await import('@ai-sdk/anthropic');
    const { getModel, BYOK_MODEL_ID } = await import('@/lib/ai');

    const model = getModel(undefined, 'sk-ant-test-key-123');

    expect(createAnthropic).toHaveBeenCalledWith({ apiKey: 'sk-ant-test-key-123' });
    // With no byokModelId, resolves to BYOK_MODEL_ID
    expect(model).toEqual({ modelId: BYOK_MODEL_ID });
  });

  it('getModel with Anthropic apiKey and explicit byokModelId uses that model', async () => {
    const { createAnthropic } = await import('@ai-sdk/anthropic');
    const { getModel } = await import('@/lib/ai');

    const model = getModel('byok', 'sk-ant-test-key-123', MODEL_IDS.SONNET);

    expect(createAnthropic).toHaveBeenCalledWith({ apiKey: 'sk-ant-test-key-123' });
    expect(model).toEqual({ modelId: MODEL_IDS.SONNET });
  });

  it('getModel with OpenRouter apiKey creates OpenRouter provider', async () => {
    const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');
    const { getModel, DEFAULT_OPENROUTER_MODEL } = await import('@/lib/ai');

    const model = getModel('byok', 'sk-or-v1-test-key-456');

    expect(createOpenRouter).toHaveBeenCalledWith({ apiKey: 'sk-or-v1-test-key-456' });
    // Without byokModelId, defaults to DEFAULT_OPENROUTER_MODEL
    expect(mockOrChat).toHaveBeenCalledWith(DEFAULT_OPENROUTER_MODEL);
    expect(model).toEqual({ modelId: DEFAULT_OPENROUTER_MODEL, provider: 'openrouter' });
  });

  it('getModel with OpenRouter apiKey and curated model uses that model', async () => {
    const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');
    const { getModel } = await import('@/lib/ai');

    const model = getModel('byok', 'sk-or-v1-test-key-456', OPENROUTER_MODELS.GEMINI_2_5_PRO);

    expect(createOpenRouter).toHaveBeenCalledWith({ apiKey: 'sk-or-v1-test-key-456' });
    expect(mockOrChat).toHaveBeenCalledWith(OPENROUTER_MODELS.GEMINI_2_5_PRO);
    expect(model).toEqual({ modelId: OPENROUTER_MODELS.GEMINI_2_5_PRO, provider: 'openrouter' });
  });

  it('getModel with OpenRouter apiKey and non-curated model falls back to default', async () => {
    const { getModel, DEFAULT_OPENROUTER_MODEL } = await import('@/lib/ai');

    const model = getModel('byok', 'sk-or-v1-test-key-456', 'unknown/fake-model');

    expect(mockOrChat).toHaveBeenCalledWith(DEFAULT_OPENROUTER_MODEL);
    expect(model).toEqual({ modelId: DEFAULT_OPENROUTER_MODEL, provider: 'openrouter' });
  });

  it('getModel without apiKey never creates OpenRouter provider', async () => {
    const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');
    const { getModel } = await import('@/lib/ai');

    getModel();
    getModel('byok');
    getModel(MODEL_IDS.SONNET);

    // createOpenRouter should only be called via the mock setup, not by getModel
    expect(createOpenRouter).not.toHaveBeenCalled();
  });
});
