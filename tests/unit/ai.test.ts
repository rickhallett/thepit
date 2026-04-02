import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_FREE_MODEL, DEFAULT_PREMIUM_MODEL, PREMIUM_MODEL_IDS } from '@/lib/model-registry';

const mockOrChat = vi.fn((modelId: string) => ({ modelId, provider: 'openrouter' }));

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => ({
    chat: mockOrChat,
  })),
}));

describe('lib/ai', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  it('DEFAULT_FREE_MODEL is a valid string', () => {
    expect(typeof DEFAULT_FREE_MODEL).toBe('string');
    expect(DEFAULT_FREE_MODEL.length).toBeGreaterThan(0);
  });

  it('PREMIUM_MODEL_IDS is an array of model IDs', () => {
    expect(Array.isArray(PREMIUM_MODEL_IDS)).toBe(true);
    expect(PREMIUM_MODEL_IDS.length).toBeGreaterThan(0);
    PREMIUM_MODEL_IDS.forEach((id: string) => {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  it('DEFAULT_PREMIUM_MODEL is the first premium option', () => {
    expect(DEFAULT_PREMIUM_MODEL).toBe(PREMIUM_MODEL_IDS[0]);
  });

  it('getModel returns provider for default model', async () => {
    const { getModel } = await import('@/lib/ai');
    const model = getModel(DEFAULT_FREE_MODEL);
    expect(model).toBeDefined();
  });

  it('getModel with BYOK key creates new OpenRouter provider', async () => {
    const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');
    const { getModel } = await import('@/lib/ai');

    const model = getModel('openai/gpt-4o', 'sk-or-v1-test-key-456');

    expect(createOpenRouter).toHaveBeenCalledWith({ apiKey: 'sk-or-v1-test-key-456' });
    expect(mockOrChat).toHaveBeenCalledWith('openai/gpt-4o');
  });

  it('getModel without BYOK key uses platform provider', async () => {
    const { getModel } = await import('@/lib/ai');
    const model = getModel(DEFAULT_FREE_MODEL);
    // Should use the platform provider (created at module level)
    expect(model).toBeDefined();
  });

  it('isAnthropicModel returns true for anthropic/ prefix', async () => {
    const { isAnthropicModel } = await import('@/lib/ai');
    expect(isAnthropicModel('anthropic/claude-haiku-4')).toBe(true);
    expect(isAnthropicModel('anthropic/claude-sonnet-4-6')).toBe(true);
  });

  it('isAnthropicModel returns false for non-anthropic models', async () => {
    const { isAnthropicModel } = await import('@/lib/ai');
    expect(isAnthropicModel('openai/gpt-4o')).toBe(false);
    expect(isAnthropicModel('google/gemini-2.5-flash-preview')).toBe(false);
  });
});
