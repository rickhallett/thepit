import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_FREE_MODEL,
  FREE_MODEL_IDS,
  PREMIUM_MODEL_IDS,
  _resetRegistry,
  getAllModelIds,
  getContextWindow,
  getInputTokenBudget,
  getModelEntry,
  getModelLabel,
  getModelPricing,
  getModelsByTier,
  getRegistry,
  isValidModelId,
  CONTEXT_SAFETY_MARGIN,
} from '@/lib/model-registry';

beforeEach(() => {
  _resetRegistry();
  delete process.env.MODEL_REGISTRY_JSON;
});

describe('default registry shape', () => {
  it('has at least 3 free models', () => {
    expect(FREE_MODEL_IDS.length).toBeGreaterThanOrEqual(3);
  });

  it('has at least 5 premium models', () => {
    expect(PREMIUM_MODEL_IDS.length).toBeGreaterThanOrEqual(5);
  });

  it('every entry has required fields with valid values', () => {
    const registry = getRegistry();
    for (const entry of registry) {
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
      expect(typeof entry.label).toBe('string');
      expect(entry.label.length).toBeGreaterThan(0);
      expect(['free', 'premium']).toContain(entry.tier);
      expect(typeof entry.contextWindow).toBe('number');
      expect(entry.contextWindow).toBeGreaterThan(0);
      expect(typeof entry.pricing.in).toBe('number');
      expect(entry.pricing.in).toBeGreaterThan(0);
      expect(typeof entry.pricing.out).toBe('number');
      expect(entry.pricing.out).toBeGreaterThan(0);
    }
  });

  it('no duplicate model IDs', () => {
    const ids = getAllModelIds();
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe('getModelEntry', () => {
  it('returns the entry for a known model', () => {
    const entry = getModelEntry('openai/gpt-4o-mini');
    expect(entry).toBeDefined();
    expect(entry?.id).toBe('openai/gpt-4o-mini');
    expect(entry?.label).toBe('GPT-4o Mini');
    expect(entry?.tier).toBe('free');
  });

  it('returns undefined for unknown model', () => {
    expect(getModelEntry('unknown/model')).toBeUndefined();
  });
});

describe('getModelsByTier', () => {
  it('returns only free models when tier is free', () => {
    const free = getModelsByTier('free');
    expect(free.length).toBeGreaterThan(0);
    for (const m of free) {
      expect(m.tier).toBe('free');
    }
  });

  it('returns only premium models when tier is premium', () => {
    const premium = getModelsByTier('premium');
    expect(premium.length).toBeGreaterThan(0);
    for (const m of premium) {
      expect(m.tier).toBe('premium');
    }
  });

  it('free and premium together cover the full registry', () => {
    const all = getRegistry();
    const free = getModelsByTier('free');
    const premium = getModelsByTier('premium');
    expect(free.length + premium.length).toBe(all.length);
  });
});

describe('getAllModelIds', () => {
  it('returns an array of all IDs', () => {
    const ids = getAllModelIds();
    expect(Array.isArray(ids)).toBe(true);
    expect(ids.length).toBe(getRegistry().length);
    for (const id of ids) {
      expect(typeof id).toBe('string');
    }
  });
});

describe('getModelLabel', () => {
  it('returns the label for a known model', () => {
    expect(getModelLabel('openai/gpt-4o-mini')).toBe('GPT-4o Mini');
  });

  it('returns the model ID itself for an unknown model', () => {
    expect(getModelLabel('unknown/nope')).toBe('unknown/nope');
  });
});

describe('getContextWindow', () => {
  it('returns 128_000 for openai/gpt-4o-mini', () => {
    expect(getContextWindow('openai/gpt-4o-mini')).toBe(128_000);
  });

  it('returns DEFAULT_CONTEXT_WINDOW for unknown model', () => {
    expect(getContextWindow('unknown/model')).toBe(DEFAULT_CONTEXT_WINDOW);
  });
});

describe('getInputTokenBudget', () => {
  it('applies the safety margin to the context window', () => {
    const window = getContextWindow('openai/gpt-4o-mini');
    const expected = Math.floor(window * (1 - CONTEXT_SAFETY_MARGIN));
    expect(getInputTokenBudget('openai/gpt-4o-mini')).toBe(expected);
  });

  it('uses DEFAULT_CONTEXT_WINDOW with safety margin for unknown model', () => {
    const expected = Math.floor(DEFAULT_CONTEXT_WINDOW * (1 - CONTEXT_SAFETY_MARGIN));
    expect(getInputTokenBudget('unknown/model')).toBe(expected);
  });
});

describe('getModelPricing', () => {
  it('returns the pricing for a known model', () => {
    const pricing = getModelPricing('openai/gpt-4o-mini');
    expect(pricing).toEqual({ in: 0.15, out: 0.60 });
  });

  it('falls back to cheapest free model pricing for unknown model', () => {
    const fallback = getModelPricing('unknown/model');
    const freeModels = getModelsByTier('free');
    const cheapest = [...freeModels].sort((a, b) => a.pricing.in - b.pricing.in)[0]!;
    expect(fallback).toEqual(cheapest.pricing);
  });
});

describe('isValidModelId', () => {
  it('returns true for a known model ID', () => {
    expect(isValidModelId('openai/gpt-4o-mini')).toBe(true);
  });

  it('returns false for an unknown model ID', () => {
    expect(isValidModelId('fake/model')).toBe(false);
  });
});

describe('derived constants', () => {
  it('DEFAULT_FREE_MODEL is the first free model', () => {
    const firstFree = getModelsByTier('free')[0];
    expect(DEFAULT_FREE_MODEL).toBe(firstFree?.id);
  });

  it('FREE_MODEL_IDS contains only free model IDs', () => {
    for (const id of FREE_MODEL_IDS) {
      expect(getModelEntry(id)?.tier).toBe('free');
    }
  });

  it('PREMIUM_MODEL_IDS contains only premium model IDs', () => {
    for (const id of PREMIUM_MODEL_IDS) {
      expect(getModelEntry(id)?.tier).toBe('premium');
    }
  });
});

describe('MODEL_REGISTRY_JSON env override', () => {
  it('loads a custom registry when env var is set', async () => {
    const custom = [
      { id: 'custom/model-a', label: 'Model A', tier: 'free', contextWindow: 50_000, pricing: { in: 0.10, out: 0.40 } },
    ];
    process.env.MODEL_REGISTRY_JSON = JSON.stringify(custom);
    _resetRegistry();
    vi.resetModules();

    const { getRegistry: freshGetRegistry } = await import('@/lib/model-registry');
    const registry = freshGetRegistry();
    expect(registry).toHaveLength(1);
    expect(registry[0]?.id).toBe('custom/model-a');
  });

  it('falls back to defaults when env var contains invalid JSON', async () => {
    process.env.MODEL_REGISTRY_JSON = 'not-valid-json';
    _resetRegistry();
    vi.resetModules();

    const { getRegistry: freshGetRegistry } = await import('@/lib/model-registry');
    const registry = freshGetRegistry();
    expect(registry.length).toBeGreaterThan(1);
  });
});
