import { describe, expect, it } from 'vitest';

import {
  detectProvider,
  isValidByokKey,
  isOpenRouterModel,
  KEY_PREFIXES,
  MODEL_IDS,
  OPENROUTER_MODELS,
  ALL_OPENROUTER_MODEL_IDS,
  OPENROUTER_MODEL_LABELS,
} from '@/lib/models';

describe('models — provider detection', () => {
  it('detectProvider returns "anthropic" for sk-ant-* keys', () => {
    expect(detectProvider('sk-ant-api03-abc123')).toBe('anthropic');
  });

  it('detectProvider returns "openrouter" for sk-or-v1-* keys', () => {
    expect(detectProvider('sk-or-v1-abc123xyz')).toBe('openrouter');
  });

  it('detectProvider returns undefined for unknown prefixes', () => {
    expect(detectProvider('sk-proj-abc123')).toBeUndefined();
    expect(detectProvider('invalid-key')).toBeUndefined();
    expect(detectProvider('')).toBeUndefined();
  });

  it('isValidByokKey returns true for known prefixes', () => {
    expect(isValidByokKey('sk-ant-test')).toBe(true);
    expect(isValidByokKey('sk-or-v1-test')).toBe(true);
  });

  it('isValidByokKey returns false for unknown prefixes', () => {
    expect(isValidByokKey('sk-openai-test')).toBe(false);
    expect(isValidByokKey('bad-key')).toBe(false);
    expect(isValidByokKey('')).toBe(false);
  });

  it('KEY_PREFIXES maps all known prefixes', () => {
    expect(Object.keys(KEY_PREFIXES)).toEqual(['sk-ant-', 'sk-or-v1-']);
    expect(KEY_PREFIXES['sk-ant-']).toBe('anthropic');
    expect(KEY_PREFIXES['sk-or-v1-']).toBe('openrouter');
  });
});

describe('models — OpenRouter registry', () => {
  it('OPENROUTER_MODELS contains expected curated models', () => {
    expect(OPENROUTER_MODELS.GPT_4O).toBe('openai/gpt-4o');
    expect(OPENROUTER_MODELS.GEMINI_2_5_PRO).toBe('google/gemini-2.5-pro-preview');
    expect(OPENROUTER_MODELS.DEEPSEEK_R1).toBe('deepseek/deepseek-r1');
    expect(OPENROUTER_MODELS.CLAUDE_SONNET_4).toBe('anthropic/claude-sonnet-4');
  });

  it('ALL_OPENROUTER_MODEL_IDS matches OPENROUTER_MODELS values', () => {
    const values = Object.values(OPENROUTER_MODELS);
    expect(ALL_OPENROUTER_MODEL_IDS).toEqual(values);
    expect(ALL_OPENROUTER_MODEL_IDS.length).toBe(13);
  });

  it('every curated model has a human-readable label', () => {
    for (const modelId of ALL_OPENROUTER_MODEL_IDS) {
      expect(OPENROUTER_MODEL_LABELS[modelId]).toBeDefined();
      expect(typeof OPENROUTER_MODEL_LABELS[modelId]).toBe('string');
      expect(OPENROUTER_MODEL_LABELS[modelId].length).toBeGreaterThan(0);
    }
  });

  it('isOpenRouterModel returns true for curated models', () => {
    expect(isOpenRouterModel('openai/gpt-4o')).toBe(true);
    expect(isOpenRouterModel('google/gemini-2.5-pro-preview')).toBe(true);
    expect(isOpenRouterModel('deepseek/deepseek-r1')).toBe(true);
  });

  it('isOpenRouterModel returns false for Anthropic and unknown models', () => {
    expect(isOpenRouterModel(MODEL_IDS.HAIKU)).toBe(false);
    expect(isOpenRouterModel('unknown/fake-model')).toBe(false);
    expect(isOpenRouterModel('')).toBe(false);
  });
});
