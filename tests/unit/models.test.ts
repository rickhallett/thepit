import { describe, expect, it } from 'vitest';

import {
  isValidByokKey,
  assertNotDeprecated,
} from '@/lib/models';

import {
  getAllModelIds,
  getModelLabel,
  isValidModelId,
  getRegistry,
} from '@/lib/model-registry';

describe('models -- BYOK key validation', () => {
  it('isValidByokKey returns true for OpenRouter keys', () => {
    expect(isValidByokKey('sk-or-v1-test')).toBe(true);
  });

  it('isValidByokKey returns false for Anthropic keys (no longer supported)', () => {
    expect(isValidByokKey('sk-ant-test')).toBe(false);
  });

  it('isValidByokKey returns false for unknown prefixes', () => {
    expect(isValidByokKey('sk-openai-test')).toBe(false);
    expect(isValidByokKey('bad-key')).toBe(false);
    expect(isValidByokKey('')).toBe(false);
  });
});

describe('models -- deprecated model guard', () => {
  it('assertNotDeprecated passes for registry models', () => {
    const ids = getAllModelIds();
    for (const id of ids) {
      expect(() => assertNotDeprecated(id, 'test')).not.toThrow();
    }
  });

  it('assertNotDeprecated warns for legacy Anthropic IDs', () => {
    // In non-production, it logs but does not throw
    expect(() => assertNotDeprecated('claude-3-haiku-20240307', 'test')).not.toThrow();
  });
});

describe('model-registry', () => {
  it('registry contains free and premium models', () => {
    const registry = getRegistry();
    expect(registry.length).toBeGreaterThanOrEqual(3);
    expect(registry.some((m) => m.tier === 'free')).toBe(true);
    expect(registry.some((m) => m.tier === 'premium')).toBe(true);
  });

  it('every model has a human-readable label', () => {
    for (const id of getAllModelIds()) {
      const label = getModelLabel(id);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('isValidModelId returns true for registry models', () => {
    expect(isValidModelId('openai/gpt-4o-mini')).toBe(true);
    expect(isValidModelId('anthropic/claude-haiku-4')).toBe(true);
  });

  it('isValidModelId returns false for unknown models', () => {
    expect(isValidModelId('unknown/fake-model')).toBe(false);
    expect(isValidModelId('')).toBe(false);
  });
});
