/**
 * Copy schema validation tests.
 *
 * Ensures every variant JSON file conforms to the CopySchema interface
 * and contains no missing or empty keys. The control variant must be
 * an exact copy of base.json.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

import type { CopySchema } from '@/copy/schema';

const COPY_DIR = join(process.cwd(), 'copy');
const VARIANTS_DIR = join(COPY_DIR, 'variants');
const BASE_PATH = join(COPY_DIR, 'base.json');

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

/**
 * Recursively collect all leaf string values from a nested object.
 * Returns an array of [dotPath, value] tuples.
 */
function collectLeafStrings(
  obj: Record<string, unknown>,
  prefix = '',
): Array<[string, unknown]> {
  const results: Array<[string, unknown]> = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      results.push([path, value]);
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'string') {
          results.push([`${path}[${i}]`, item]);
        } else if (typeof item === 'object' && item !== null) {
          results.push(
            ...collectLeafStrings(item as Record<string, unknown>, `${path}[${i}]`),
          );
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      results.push(
        ...collectLeafStrings(value as Record<string, unknown>, path),
      );
    }
  }
  return results;
}

/**
 * Recursively collect all keys from a nested object (non-leaf paths too).
 */
function collectAllKeys(
  obj: Record<string, unknown>,
  prefix = '',
): string[] {
  const results: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    results.push(path);
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      results.push(
        ...collectAllKeys(value as Record<string, unknown>, path),
      );
    }
  }
  return results;
}

describe('Copy Schema Validation', () => {
  const base = loadJson(BASE_PATH) as CopySchema;

  it('base.json exists and is valid JSON', () => {
    expect(base).toBeDefined();
    expect(typeof base).toBe('object');
  });

  it('base.json has all top-level schema keys', () => {
    const expectedKeys = [
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
      expect(base).toHaveProperty(key);
    }
  });

  it('control.json is identical to base.json', () => {
    const control = loadJson(join(VARIANTS_DIR, 'control.json'));
    expect(control).toEqual(base);
  });

  it('every leaf string in base.json is non-empty', () => {
    const leaves = collectLeafStrings(base as unknown as Record<string, unknown>);
    const emptyLeaves = leaves.filter(
      ([, value]) => typeof value === 'string' && value.trim() === '',
    );
    expect(emptyLeaves).toEqual([]);
  });

  // Validate every variant JSON in the variants directory
  const variantFiles = readdirSync(VARIANTS_DIR)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));

  for (const file of variantFiles) {
    describe(`variant: ${file}`, () => {
      const variant = loadJson(join(VARIANTS_DIR, file)) as Record<string, unknown>;

      it('has all top-level keys from base', () => {
        const baseKeys = Object.keys(base);
        for (const key of baseKeys) {
          expect(variant).toHaveProperty(key);
        }
      });

      it('has no empty string values', () => {
        const leaves = collectLeafStrings(variant);
        const emptyLeaves = leaves.filter(
          ([, value]) => typeof value === 'string' && value.trim() === '',
        );
        expect(emptyLeaves).toEqual([]);
      });
    });
  }

  // Validate meta files
  const metaFiles = readdirSync(VARIANTS_DIR)
    .filter((f) => f.endsWith('.meta.json'));

  for (const file of metaFiles) {
    describe(`meta: ${file}`, () => {
      const meta = loadJson(join(VARIANTS_DIR, file)) as Record<string, unknown>;

      it('has required fields', () => {
        expect(meta).toHaveProperty('name');
        expect(meta).toHaveProperty('dimensions');
        expect(meta).toHaveProperty('generatedAt');
        expect(meta).toHaveProperty('model');
      });

      it('has valid dimension values (0-100)', () => {
        const dims = meta.dimensions as Record<string, number>;
        for (const [key, value] of Object.entries(dims)) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
          expect(typeof value).toBe('number');
        }
      });
    });
  }
});
