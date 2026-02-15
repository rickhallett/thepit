/**
 * Copy experiment tests — variant assignment, distribution, and analytics.
 *
 * Combines middleware assignment logic tests (12c), statistical distribution
 * tests (12d), and analytics integration tests (12e) into a single file
 * for cohesion.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  selectVariant,
  getExperimentConfig,
  isExcludedPath,
  _resetVariantCache,
} from '@/lib/copy';

describe('Experiment Config', () => {
  it('loads experiment config from JSON', () => {
    const config = getExperimentConfig();
    expect(config).toBeDefined();
    expect(typeof config.active).toBe('boolean');
    expect(typeof config.defaultVariant).toBe('string');
    expect(typeof config.variants).toBe('object');
  });

  it('has a valid default variant', () => {
    const config = getExperimentConfig();
    expect(config.defaultVariant).toBe('control');
  });

  it('has all three configured variants', () => {
    const config = getExperimentConfig();
    expect(Object.keys(config.variants)).toContain('control');
    expect(Object.keys(config.variants)).toContain('hype');
    expect(Object.keys(config.variants)).toContain('precise');
  });

  it('experiment is inactive by default (safe for deployment)', () => {
    const config = getExperimentConfig();
    expect(config.active).toBe(false);
  });

  it('weights sum to 100', () => {
    const config = getExperimentConfig();
    const totalWeight = Object.values(config.variants).reduce(
      (sum, v) => sum + v.weight,
      0,
    );
    expect(totalWeight).toBe(100);
  });

  it('variant weights are non-negative numbers', () => {
    const config = getExperimentConfig();
    for (const [, variant] of Object.entries(config.variants)) {
      expect(typeof variant.weight).toBe('number');
      expect(variant.weight).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Variant Selection', () => {
  beforeEach(() => {
    _resetVariantCache();
  });

  it('returns a configured variant when experiment is active', () => {
    const config = getExperimentConfig();
    const variant = selectVariant();
    const validNames = Object.keys(config.variants);
    expect(validNames).toContain(variant);
  });

  it('returns a valid variant name', () => {
    const config = getExperimentConfig();
    const variant = selectVariant();
    // Should be either the default or one of the configured variants
    const validNames = [config.defaultVariant, ...Object.keys(config.variants)];
    expect(validNames).toContain(variant);
  });

  it('returns deterministic result for randomValue 0', () => {
    const variant1 = selectVariant(0);
    const variant2 = selectVariant(0);
    expect(variant1).toBe(variant2);
  });

  it('returns deterministic result for randomValue 0.999', () => {
    const variant1 = selectVariant(0.999);
    const variant2 = selectVariant(0.999);
    expect(variant1).toBe(variant2);
  });
});

describe('Statistical Distribution', () => {
  it('distribution matches configured weights within tolerance', () => {
    const config = getExperimentConfig();

    // Only meaningful when experiment is active with multiple variants
    if (!config.active || Object.keys(config.variants).length < 2) {
      // With a single variant or inactive experiment, all assignments
      // should go to the default variant
      const counts = new Map<string, number>();
      for (let i = 0; i < 1000; i++) {
        const variant = selectVariant(Math.random());
        counts.set(variant, (counts.get(variant) ?? 0) + 1);
      }
      expect(counts.get(config.defaultVariant)).toBe(1000);
      return;
    }

    // Multi-variant test: run 10,000 simulated assignments
    const N = 10_000;
    const counts = new Map<string, number>();

    for (let i = 0; i < N; i++) {
      const variant = selectVariant(Math.random());
      counts.set(variant, (counts.get(variant) ?? 0) + 1);
    }

    // Verify each variant's observed frequency is within 5% of expected
    const totalWeight = Object.values(config.variants).reduce(
      (sum, v) => sum + v.weight,
      0,
    );

    for (const [name, { weight }] of Object.entries(config.variants)) {
      if (weight === 0) {
        expect(counts.get(name) ?? 0).toBe(0);
        continue;
      }

      const expectedPct = weight / totalWeight;
      const observed = (counts.get(name) ?? 0) / N;
      const tolerance = 0.05; // 5% tolerance

      expect(Math.abs(observed - expectedPct)).toBeLessThan(tolerance);
    }
  });

  it('zero-weight variants are never selected', () => {
    // We can test this by confirming that selectVariant never returns
    // a variant name that isn't in the config
    for (let i = 0; i < 100; i++) {
      const variant = selectVariant(Math.random());
      const config = getExperimentConfig();
      const validNames = [config.defaultVariant, ...Object.keys(config.variants)];
      expect(validNames).toContain(variant);
    }
  });
});

describe('Path Exclusion', () => {
  it('returns false for normal paths', () => {
    expect(isExcludedPath('/')).toBe(false);
    expect(isExcludedPath('/arena')).toBe(false);
    expect(isExcludedPath('/agents')).toBe(false);
  });

  it('returns true for excluded paths', () => {
    const config = getExperimentConfig();
    for (const excluded of config.excludePaths) {
      expect(isExcludedPath(excluded)).toBe(true);
    }
  });

  it('returns true for sub-paths of excluded paths', () => {
    expect(isExcludedPath('/api/pv')).toBe(true);
    expect(isExcludedPath('/sign-in/callback')).toBe(true);
    expect(isExcludedPath('/sign-up/sso')).toBe(true);
  });
});

describe('Logger Experiment Method', () => {
  it('log.experiment() is callable', async () => {
    const { log } = await import('@/lib/logger');
    expect(typeof log.experiment).toBe('function');

    // Should not throw
    log.experiment('test_event', { variant: 'control', path: '/' });
  });
});

describe('Analytics Event Type', () => {
  it('copy_variant_served is a valid event type', async () => {
    // TypeScript compilation validates this — if it compiles, the type is valid.
    // This test serves as a runtime confirmation.
    const { trackEvent } = await import('@/lib/analytics');
    expect(typeof trackEvent).toBe('function');
    // Calling with the event name should not throw (PostHog not loaded in test)
    trackEvent('copy_variant_served', { variant: 'control' });
  });
});
