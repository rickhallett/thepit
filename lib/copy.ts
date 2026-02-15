/**
 * Copy resolution runtime for A/B testing website copy.
 *
 * Resolves variant-specific copy from pre-built JSON files. The active
 * variant is determined by the `x-copy-variant` header set by middleware.
 *
 * Server components:  const c = getCopy();
 * Client components:  const c = useCopy();
 *
 * Architecture:
 * - Variant JSONs are loaded once at module init and cached in a Map
 * - Missing keys in a variant fall back to control via deep merge
 * - The resolved copy object is frozen (immutable) to prevent mutations
 * - Unknown variant names fall back to 'control'
 *
 * @see copy/schema.ts for the CopySchema interface
 * @see copy/experiment.json for traffic allocation config
 * @see middleware.ts for variant assignment logic
 */

import { headers } from 'next/headers';
import { cache } from 'react';

import type { CopySchema } from '@/copy/schema';

// ---------------------------------------------------------------------------
// Variant loading — parsed once at module init, cached per variant
// ---------------------------------------------------------------------------

import controlData from '@/copy/variants/control.json';
import experimentConfig from '@/copy/experiment.json';

/** Pre-loaded variant data keyed by variant name. */
const variantCache = new Map<string, CopySchema>();

// Control is always available as the baseline.
variantCache.set('control', controlData as unknown as CopySchema);

/**
 * Deep-merge `source` into `target`, filling in missing keys.
 * Arrays are NOT merged — source arrays replace target arrays.
 * Returns a new object (does not mutate inputs).
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  fallback: Record<string, unknown>,
): T {
  const result = { ...target } as Record<string, unknown>;
  for (const key of Object.keys(fallback)) {
    if (!(key in result) || result[key] === undefined) {
      result[key] = fallback[key];
    } else if (
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key]) &&
      typeof fallback[key] === 'object' &&
      fallback[key] !== null &&
      !Array.isArray(fallback[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        fallback[key] as Record<string, unknown>,
      );
    }
  }
  return result as T;
}

/**
 * Deep-freeze an object recursively. Prevents accidental mutation of
 * shared copy data across requests.
 */
function deepFreeze<T extends Record<string, unknown>>(obj: T): T {
  Object.freeze(obj);
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
      deepFreeze(value as Record<string, unknown>);
    }
  }
  return obj;
}

// Freeze the control variant at module load.
deepFreeze(controlData as unknown as Record<string, unknown>);

/**
 * Load and cache a variant by name.
 *
 * Variant JSON files are expected at `copy/variants/{name}.json`.
 * They are dynamically imported on first access. If the import fails
 * (file doesn't exist), we fall back to control silently.
 *
 * The loaded variant is deep-merged with control to fill any missing
 * keys, then deep-frozen for immutability.
 */
async function loadVariant(name: string): Promise<CopySchema> {
  if (variantCache.has(name)) {
    return variantCache.get(name)!;
  }

  try {
    // Dynamic import for non-control variants.
    // These modules must exist at build time (static analysis).
    // For dynamically generated variants, they are committed to git
    // and available in the build output.
    const mod = await import(`@/copy/variants/${name}.json`);
    const data = (mod.default ?? mod) as Record<string, unknown>;
    const control = variantCache.get('control')! as unknown as Record<string, unknown>;
    const merged = deepMerge(data, control) as unknown as CopySchema;
    deepFreeze(merged as unknown as Record<string, unknown>);
    variantCache.set(name, merged);
    return merged;
  } catch {
    // Variant file not found — fall back to control.
    return variantCache.get('control')!;
  }
}

// Pre-load configured variants at module init (best-effort).
// This ensures they're cached before the first request.
const configuredVariants = Object.keys(experimentConfig.variants ?? {});
for (const name of configuredVariants) {
  if (name !== 'control') {
    loadVariant(name).catch(() => {
      // Silently ignore — variant will fall back to control at request time.
    });
  }
}

// ---------------------------------------------------------------------------
// Experiment assignment
// ---------------------------------------------------------------------------

export interface ExperimentConfig {
  active: boolean;
  defaultVariant: string;
  variants: Record<string, { weight: number; file: string }>;
  excludePaths: string[];
  startedAt: string | null;
}

/**
 * Get the current experiment configuration.
 * Loaded from copy/experiment.json at module init.
 */
export function getExperimentConfig(): ExperimentConfig {
  return experimentConfig as ExperimentConfig;
}

/**
 * Select a variant name based on weighted random assignment.
 *
 * Uses the traffic weights defined in experiment.json. The algorithm
 * normalizes weights to sum to 100, then picks based on a random number.
 *
 * @param randomValue - Optional 0-1 random value for deterministic testing.
 * @returns The name of the selected variant.
 */
export function selectVariant(randomValue?: number): string {
  const config = getExperimentConfig();

  if (!config.active) {
    return config.defaultVariant;
  }

  const entries = Object.entries(config.variants);
  if (entries.length === 0) {
    return config.defaultVariant;
  }

  // Filter out zero-weight variants
  const weighted = entries.filter(([, v]) => v.weight > 0);
  if (weighted.length === 0) {
    return config.defaultVariant;
  }

  const totalWeight = weighted.reduce((sum, [, v]) => sum + v.weight, 0);
  const rand = (randomValue ?? Math.random()) * totalWeight;

  let cumulative = 0;
  for (const [name, { weight }] of weighted) {
    cumulative += weight;
    if (rand < cumulative) {
      return name;
    }
  }

  // Edge case: floating point — return last variant.
  return weighted[weighted.length - 1][0];
}

/**
 * Check whether a path is excluded from the experiment.
 */
export function isExcludedPath(path: string): boolean {
  const config = getExperimentConfig();
  return config.excludePaths.some((pattern) => path.startsWith(pattern));
}

// ---------------------------------------------------------------------------
// Server-side copy resolution
// ---------------------------------------------------------------------------

/** Header name used to propagate variant from middleware to server components. */
export const COPY_VARIANT_HEADER = 'x-copy-variant';

/** Cookie name for sticky variant assignment. */
export const VARIANT_COOKIE = 'pit_variant';

/**
 * Get the copy object for a specific variant.
 *
 * Deep-merged with control to fill missing keys.
 * Returns a frozen, immutable object.
 */
export function getCopyForVariant(variant: string): CopySchema {
  // Synchronous path for control (most common).
  if (variant === 'control' || !variant) {
    return variantCache.get('control')!;
  }

  // Check cache first (variants are pre-loaded at init).
  const cached = variantCache.get(variant);
  if (cached) return cached;

  // Not cached — fall back to control. The async load may populate it
  // for future requests.
  loadVariant(variant).catch(() => {});
  return variantCache.get('control')!;
}

/**
 * Get the copy object for the current request.
 *
 * Reads the active variant from the `x-copy-variant` header set by
 * middleware. Falls back to 'control' if no header is present.
 *
 * This function is request-scoped via React's `cache()` so it only
 * reads headers once per request.
 *
 * Usage in Server Components:
 *   const c = await getCopy();
 *   <h1>{c.hero.headline}</h1>
 */
export const getCopy = cache(async (): Promise<CopySchema> => {
  const h = await headers();
  const variant = h.get(COPY_VARIANT_HEADER) ?? 'control';
  return getCopyForVariant(variant);
});

/**
 * Get the active variant name for the current request.
 * Useful for analytics and logging.
 */
export const getActiveVariant = cache(async (): Promise<string> => {
  const h = await headers();
  return h.get(COPY_VARIANT_HEADER) ?? 'control';
});

// ---------------------------------------------------------------------------
// Client-side copy resolution
// ---------------------------------------------------------------------------

export { CopyProvider, useCopy } from '@/lib/copy-client';

// ---------------------------------------------------------------------------
// Test helpers (not exported from the main module in production)
// ---------------------------------------------------------------------------

/** @internal Reset the variant cache — for tests only. */
export function _resetVariantCache(): void {
  variantCache.clear();
  variantCache.set('control', controlData as unknown as CopySchema);
  deepFreeze(controlData as unknown as Record<string, unknown>);
}
