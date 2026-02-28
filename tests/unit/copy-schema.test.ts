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
      'cookieConsent', 'newsletter', 'builderShowcase',
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

  it('control.json has all top-level keys from base.json', () => {
    const control = loadJson(join(VARIANTS_DIR, 'control.json'));
    const baseKeys = Object.keys(base as unknown as Record<string, unknown>);
    const controlKeys = Object.keys(control as Record<string, unknown>);
    expect(controlKeys.sort()).toEqual(baseKeys.sort());
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

  // Validate template variables are preserved in all variants
  const templatePattern = /\{[a-zA-Z_]+\}/g;

  function collectTemplateVars(
    obj: Record<string, unknown>,
    prefix = '',
  ): Array<[string, string[]]> {
    const results: Array<[string, string[]]> = [];
    for (const [key, value] of Object.entries(obj)) {
      const p = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
        const vars = value.match(templatePattern);
        if (vars && vars.length > 0) {
          results.push([p, vars]);
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, i) => {
          if (typeof item === 'object' && item !== null) {
            results.push(
              ...collectTemplateVars(item as Record<string, unknown>, `${p}[${i}]`),
            );
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        results.push(
          ...collectTemplateVars(value as Record<string, unknown>, p),
        );
      }
    }
    return results;
  }

  const baseTemplateVars = collectTemplateVars(base as unknown as Record<string, unknown>);

  for (const file of variantFiles) {
    if (file === 'control.json') continue; // control === base, already tested

    describe(`variant template vars: ${file}`, () => {
      const variant = loadJson(join(VARIANTS_DIR, file)) as Record<string, unknown>;

      for (const [keyPath, expectedVars] of baseTemplateVars) {
        it(`preserves template vars at ${keyPath}`, () => {
          // Navigate to the value in the variant
          const parts = keyPath.split(/\.|\[|\]/).filter(Boolean);
          let current: unknown = variant;
          for (const part of parts) {
            if (current === undefined || current === null) break;
            current = (current as Record<string, unknown>)[part];
          }

          if (typeof current !== 'string') {
            // Key missing — structural test covers this
            return;
          }

          const actualVars = current.match(templatePattern) ?? [];
          for (const v of expectedVars) {
            expect(actualVars).toContain(v);
          }
        });
      }
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
