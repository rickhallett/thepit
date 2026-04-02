// lib/models.ts
// BYOK key validation and deprecated model guards.
//
// Model metadata (IDs, labels, context limits, pricing) has moved to
// lib/model-registry.ts. This file retains only key validation and
// the deprecated-model safety check.

const OPENROUTER_KEY_PREFIX = 'sk-or-v1-';

/**
 * Check whether an API key is a valid OpenRouter BYOK key.
 */
export function isValidByokKey(apiKey: string): boolean {
  return apiKey.startsWith(OPENROUTER_KEY_PREFIX);
}

/**
 * Known-deprecated model IDs that should never appear in production.
 */
const DEPRECATED_MODELS = [
  'claude-3-haiku-20240307',
  'claude-3-5-haiku-20241022',
  'claude-3-sonnet-20240229',
  'claude-3-opus-20240229',
  'claude-3-5-sonnet-20240620',
  'claude-3-5-sonnet-20241022',
  'claude-opus-4-5-20251101',
  'claude-opus-4-6',
  // Legacy non-OpenRouter format IDs
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-5-20250929',
  'claude-sonnet-4-6',
];

/**
 * Validate that a model ID is not deprecated.
 */
export function assertNotDeprecated(modelId: string, source: string): string {
  if (DEPRECATED_MODELS.includes(modelId)) {
    const msg = `DEPRECATED MODEL DETECTED: "${modelId}" from ${source}. ` +
      `Use OpenRouter format IDs (e.g. anthropic/claude-haiku-4).`;
    console.error(`[models] ${msg}`);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    }
  }
  return modelId;
}
