/**
 * Copy resolution tests.
 *
 * Verifies the runtime copy resolution logic including:
 * - Variant loading and caching
 * - Deep merge fallback for missing keys
 * - Immutability (frozen objects)
 * - Unknown variant fallback to control
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  getCopyForVariant,
  _resetVariantCache,
} from '@/lib/copy';
import type { CopySchema } from '@/copy/schema';

// Import the raw control data for comparison
import controlData from '@/copy/variants/control.json';

describe('Copy Resolution', () => {
  beforeEach(() => {
    _resetVariantCache();
  });

  describe('getCopyForVariant', () => {
    it('returns control copy when variant is "control"', () => {
      const copy = getCopyForVariant('control');
      expect(copy).toBeDefined();
      expect(copy.hero.headline).toBe(controlData.hero.headline);
      expect(copy.hero.ctaPrimary).toBe(controlData.hero.ctaPrimary);
    });

    it('returns control copy when variant is empty string', () => {
      const copy = getCopyForVariant('');
      expect(copy).toBeDefined();
      expect(copy.hero.headline).toBe(controlData.hero.headline);
    });

    it('returns control copy for unknown variant', () => {
      const copy = getCopyForVariant('nonexistent-variant-xyz');
      expect(copy).toBeDefined();
      expect(copy.hero.headline).toBe(controlData.hero.headline);
    });

    it('returns immutable (frozen) copy object', () => {
      const copy = getCopyForVariant('control');
      expect(Object.isFrozen(copy)).toBe(true);
      expect(Object.isFrozen(copy.hero)).toBe(true);
    });

    it('returns the same reference on subsequent calls', () => {
      const copy1 = getCopyForVariant('control');
      const copy2 = getCopyForVariant('control');
      expect(copy1).toBe(copy2);
    });

    it('control variant has all expected top-level keys', () => {
      const copy = getCopyForVariant('control');
      const expectedKeys: (keyof CopySchema)[] = [
        'meta', 'hero', 'howItWorks', 'featuredPresets', 'researchLayer',
        'pricing', 'arena', 'arenaBuilderPage', 'arenaComponent', 'nav',
        'cookieConsent', 'newsletter', 'builderShowcase', 'darwinCountdown',
        'rateLimit', 'presetCard', 'arenaBuilderComponent', 'agentBuilder',
        'agents', 'agentDetail', 'agentNew', 'agentClone', 'recentBouts',
        'leaderboard', 'researchPage', 'developers', 'roadmap', 'feedback',
        'contact', 'boutCard', 'authControls', 'featureRequest',
        'paperSubmission', 'checkout', 'common', 'legal',
      ];
      for (const key of expectedKeys) {
        expect(copy).toHaveProperty(key);
      }
    });

    it('hero section has all required fields', () => {
      const copy = getCopyForVariant('control');
      expect(typeof copy.hero.badge).toBe('string');
      expect(typeof copy.hero.headline).toBe('string');
      expect(typeof copy.hero.subheadline).toBe('string');
      expect(typeof copy.hero.ctaPrimary).toBe('string');
      expect(typeof copy.hero.ctaSecondary).toBe('string');
      expect(typeof copy.hero.introPool.label).toBe('string');
    });

    it('nav section has primary and overflow links', () => {
      const copy = getCopyForVariant('control');
      expect(Array.isArray(copy.nav.primary)).toBe(true);
      expect(copy.nav.primary.length).toBeGreaterThan(0);
      expect(Array.isArray(copy.nav.overflow)).toBe(true);
      expect(copy.nav.overflow.length).toBeGreaterThan(0);
      for (const link of copy.nav.primary) {
        expect(typeof link.label).toBe('string');
        expect(typeof link.href).toBe('string');
      }
    });

    it('pricing plans have features arrays', () => {
      const copy = getCopyForVariant('control');
      expect(Array.isArray(copy.pricing.plans)).toBe(true);
      for (const plan of copy.pricing.plans) {
        expect(typeof plan.name).toBe('string');
        expect(typeof plan.cta).toBe('string');
        expect(Array.isArray(plan.features)).toBe(true);
        expect(plan.features.length).toBeGreaterThan(0);
      }
    });
  });
});
