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
//
// Multi-provider BYOK:
//   Users can supply keys from Anthropic (sk-ant-*) or OpenRouter (sk-or-v1-*).
//   The provider is detected from the key prefix. OpenRouter keys unlock
//   access to a curated subset of 300+ models via OPENROUTER_MODELS below.

// ---------------------------------------------------------------------------
// Provider types
// ---------------------------------------------------------------------------

/** BYOK-supported providers. Detected from API key prefix. */
export type ByokProvider = 'anthropic' | 'openrouter';

/** Key prefix → provider mapping. */
export const KEY_PREFIXES: Record<string, ByokProvider> = {
  'sk-ant-': 'anthropic',
  'sk-or-v1-': 'openrouter',
};

/**
 * Detect the provider from an API key prefix.
 * Returns undefined if the key doesn't match any known provider.
 */
export function detectProvider(apiKey: string): ByokProvider | undefined {
  for (const [prefix, provider] of Object.entries(KEY_PREFIXES)) {
    if (apiKey.startsWith(prefix)) return provider;
  }
  return undefined;
}

/**
 * Check whether an API key is from a known BYOK provider.
 */
export function isValidByokKey(apiKey: string): boolean {
  return detectProvider(apiKey) !== undefined;
}

// ---------------------------------------------------------------------------
// Canonical Anthropic model IDs
// ---------------------------------------------------------------------------

export const MODEL_IDS = {
  HAIKU: 'claude-haiku-4-5-20251001',
  SONNET: 'claude-sonnet-4-5-20250929',
  OPUS_45: 'claude-opus-4-5-20251101',
  OPUS_46: 'claude-opus-4-6',
} as const;

export type ModelId = (typeof MODEL_IDS)[keyof typeof MODEL_IDS];

/** All known Anthropic model IDs as an array (useful for validation loops). */
export const ALL_MODEL_IDS: ModelId[] = Object.values(MODEL_IDS);

// ---------------------------------------------------------------------------
// Curated OpenRouter models
// ---------------------------------------------------------------------------

/**
 * Curated list of OpenRouter models available for BYOK users.
 * These are high-quality models suitable for debate/argumentation.
 * Model IDs use OpenRouter's provider/model format.
 *
 * To add a model: add an entry here and in OPENROUTER_MODEL_CONTEXT_LIMITS
 * in lib/ai.ts if the context window differs from the default.
 */
export const OPENROUTER_MODELS = {
  // OpenAI
  GPT_4O: 'openai/gpt-4o',
  GPT_4O_MINI: 'openai/gpt-4o-mini',
  GPT_4_1: 'openai/gpt-4.1',
  O4_MINI: 'openai/o4-mini',
  // Google
  GEMINI_2_5_PRO: 'google/gemini-2.5-pro-preview',
  GEMINI_2_5_FLASH: 'google/gemini-2.5-flash-preview',
  // Meta
  LLAMA_4_MAVERICK: 'meta-llama/llama-4-maverick',
  LLAMA_4_SCOUT: 'meta-llama/llama-4-scout',
  // Anthropic (via OpenRouter)
  CLAUDE_SONNET_4: 'anthropic/claude-sonnet-4',
  CLAUDE_HAIKU_4: 'anthropic/claude-haiku-4',
  // DeepSeek
  DEEPSEEK_R1: 'deepseek/deepseek-r1',
  DEEPSEEK_V3: 'deepseek/deepseek-chat-v3-0324',
  // Mistral
  MISTRAL_LARGE: 'mistralai/mistral-large-2411',
} as const;

export type OpenRouterModelId =
  (typeof OPENROUTER_MODELS)[keyof typeof OPENROUTER_MODELS];

/** All curated OpenRouter model IDs as an array. */
export const ALL_OPENROUTER_MODEL_IDS: OpenRouterModelId[] =
  Object.values(OPENROUTER_MODELS);

/**
 * Human-readable labels for OpenRouter models (used in UI pickers).
 */
export const OPENROUTER_MODEL_LABELS: Record<OpenRouterModelId, string> = {
  [OPENROUTER_MODELS.GPT_4O]: 'GPT-4o',
  [OPENROUTER_MODELS.GPT_4O_MINI]: 'GPT-4o Mini',
  [OPENROUTER_MODELS.GPT_4_1]: 'GPT-4.1',
  [OPENROUTER_MODELS.O4_MINI]: 'o4 Mini',
  [OPENROUTER_MODELS.GEMINI_2_5_PRO]: 'Gemini 2.5 Pro',
  [OPENROUTER_MODELS.GEMINI_2_5_FLASH]: 'Gemini 2.5 Flash',
  [OPENROUTER_MODELS.LLAMA_4_MAVERICK]: 'Llama 4 Maverick',
  [OPENROUTER_MODELS.LLAMA_4_SCOUT]: 'Llama 4 Scout',
  [OPENROUTER_MODELS.CLAUDE_SONNET_4]: 'Claude Sonnet 4',
  [OPENROUTER_MODELS.CLAUDE_HAIKU_4]: 'Claude Haiku 4',
  [OPENROUTER_MODELS.DEEPSEEK_R1]: 'DeepSeek R1',
  [OPENROUTER_MODELS.DEEPSEEK_V3]: 'DeepSeek V3',
  [OPENROUTER_MODELS.MISTRAL_LARGE]: 'Mistral Large',
};

/**
 * Check whether a model ID is a known curated OpenRouter model.
 */
export function isOpenRouterModel(modelId: string): boolean {
  return ALL_OPENROUTER_MODEL_IDS.includes(modelId as OpenRouterModelId);
}

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
export const DEFAULT_FREE_MODEL = MODEL_IDS.SONNET;

/** Default premium model options (comma-separated for env var compat). */
export const DEFAULT_PREMIUM_MODELS = [
  MODEL_IDS.SONNET,
  MODEL_IDS.OPUS_45,
  MODEL_IDS.OPUS_46,
].join(',');

/** Default premium model (first in the premium list). */
export const DEFAULT_PREMIUM_MODEL = MODEL_IDS.SONNET;

/** Model used for first-bout promotion (free-tier users get one premium bout). */
export const FIRST_BOUT_PROMOTION_MODEL = MODEL_IDS.SONNET;

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
    const value = process.env[envVar]?.trim();
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
