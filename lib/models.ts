// Centralized model ID registry.
//
// Every model reference in the codebase MUST use these constants.
// Adding a magic-string model ID anywhere else is a bug.
//
// When rotating models:
//   1. Update the ID here.
//   2. Run `pnpm run test:unit` — any test using MODEL_IDS will pick up
//      the new value automatically.
//   3. Update MODEL_PRICES_GBP in lib/credits.ts and MODEL_CONTEXT_LIMITS
//      in lib/ai.ts if pricing or context windows changed.

// ---------------------------------------------------------------------------
// Canonical model IDs
// ---------------------------------------------------------------------------

export const MODEL_IDS = {
  HAIKU: 'claude-haiku-4-5-20251001',
  SONNET: 'claude-sonnet-4-5-20250929',
  OPUS_45: 'claude-opus-4-5-20251101',
  OPUS_46: 'claude-opus-4-6',
} as const;

export type ModelId = (typeof MODEL_IDS)[keyof typeof MODEL_IDS];

/** All known model IDs as an array (useful for validation loops). */
export const ALL_MODEL_IDS: ModelId[] = Object.values(MODEL_IDS);

// ---------------------------------------------------------------------------
// Model families (for tier access checks)
// ---------------------------------------------------------------------------

export type ModelFamily = 'haiku' | 'sonnet' | 'opus';

export const MODEL_FAMILY: Record<ModelId, ModelFamily> = {
  [MODEL_IDS.HAIKU]: 'haiku',
  [MODEL_IDS.SONNET]: 'sonnet',
  [MODEL_IDS.OPUS_45]: 'opus',
  [MODEL_IDS.OPUS_46]: 'opus',
};

// ---------------------------------------------------------------------------
// Default model lists (used as env var defaults)
// ---------------------------------------------------------------------------

/** Default free-tier model. */
export const DEFAULT_FREE_MODEL = MODEL_IDS.HAIKU;

/** Default premium model options (comma-separated for env var compat). */
export const DEFAULT_PREMIUM_MODELS = [
  MODEL_IDS.SONNET,
  MODEL_IDS.OPUS_45,
  MODEL_IDS.OPUS_46,
].join(',');

/** Default premium model (first in the premium list). */
export const DEFAULT_PREMIUM_MODEL = MODEL_IDS.SONNET;

/** Model used for first-bout promotion (free-tier users get one premium bout). */
export const FIRST_BOUT_PROMOTION_MODEL = MODEL_IDS.OPUS_46;

// ---------------------------------------------------------------------------
// Deprecated model guard
// ---------------------------------------------------------------------------

/**
 * Known-deprecated model IDs that should never appear in production.
 * If an env var resolves to one of these, the server logs an error on startup.
 */
const DEPRECATED_MODELS = [
  'claude-3-haiku-20240307',
  'claude-3-5-haiku-20241022',
  'claude-3-sonnet-20240229',
  'claude-3-opus-20240229',
  'claude-3-5-sonnet-20240620',
  'claude-3-5-sonnet-20241022',
];

/**
 * Validate that a model ID is not deprecated.
 * Returns the model ID if valid, or throws if deprecated.
 */
export function assertNotDeprecated(modelId: string, source: string): string {
  if (DEPRECATED_MODELS.includes(modelId)) {
    const msg = `DEPRECATED MODEL DETECTED: "${modelId}" from ${source}. ` +
      `Minimum supported: ${MODEL_IDS.HAIKU}. ` +
      `Update your environment variable to a current model ID.`;
    console.error(`[models] ${msg}`);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    }
  }
  return modelId;
}

/**
 * Run on module load: validate all model-related env vars.
 * In production, deprecated models crash the process.
 * In dev/test, they log errors but allow startup.
 */
function validateModelEnvVars(): void {
  const envVars = [
    'ANTHROPIC_MODEL',
    'ANTHROPIC_FREE_MODEL',
    'ANTHROPIC_PREMIUM_MODEL',
    'ANTHROPIC_BYOK_MODEL',
    'ASK_THE_PIT_MODEL',
  ] as const;

  for (const envVar of envVars) {
    const value = process.env[envVar];
    if (value) {
      assertNotDeprecated(value, `env.${envVar}`);
    }
  }

  // Also check comma-separated premium models list
  const premiumList = process.env.ANTHROPIC_PREMIUM_MODELS;
  if (premiumList) {
    for (const id of premiumList.split(',').map((s) => s.trim()).filter(Boolean)) {
      assertNotDeprecated(id, 'env.ANTHROPIC_PREMIUM_MODELS');
    }
  }
}

// Run validation at import time (fail-fast), but only on the server.
// Client bundles import MODEL_IDS for display purposes only.
if (typeof window === 'undefined') {
  validateModelEnvVars();
}
