/**
 * Edge-safe copy A/B testing utilities.
 *
 * This module contains ONLY the experiment configuration, variant selection,
 * and path exclusion logic needed by Edge Middleware. It does NOT import
 * `next/headers`, React `cache()`, or any server-component-only APIs.
 *
 * Middleware imports from here; `lib/copy.ts` re-exports for convenience
 * so server components can still use a single import path.
 *
 * @see copy/experiment.json for traffic allocation config
 * @see middleware.ts for variant assignment logic
 */

import experimentConfig from '@/copy/experiment.json';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Header name used to propagate variant from middleware to server components. */
export const COPY_VARIANT_HEADER = 'x-copy-variant';

/** Cookie name for sticky variant assignment. */
export const VARIANT_COOKIE = 'pit_variant';

// ---------------------------------------------------------------------------
// Experiment configuration
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

// ---------------------------------------------------------------------------
// Variant selection
// ---------------------------------------------------------------------------

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
