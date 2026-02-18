// AI model provider configuration and resolution.
//
// Three model tiers:
//   - Free:    Haiku (cheapest, used for free-tier presets and share line generation)
//   - Premium: Sonnet/Opus (used for premium presets and arena mode)
//   - BYOK:    User-supplied API key — Anthropic (sk-ant-*) or OpenRouter (sk-or-v1-*)
//
// The getModel() function resolves a model ID + optional API key into a
// provider instance. For BYOK, the key prefix determines the provider:
//   - sk-ant-*   → Anthropic directly (backward compatible)
//   - sk-or-v1-* → OpenRouter (300+ models via curated subset)
//
// Platform-funded calls always use Anthropic directly. OpenRouter is
// BYOK-only — the platform never routes its own calls through OpenRouter.
//
// LLM cost/token analytics are captured via PostHog $ai_generation events
// in the bout engine (lib/bout-engine.ts) after each turn completes.

import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import {
  MODEL_IDS,
  ALL_MODEL_IDS,
  OPENROUTER_MODELS,
  ALL_OPENROUTER_MODEL_IDS,
  DEFAULT_FREE_MODEL,
  DEFAULT_PREMIUM_MODELS,
  DEFAULT_PREMIUM_MODEL,
  detectProvider,
} from '@/lib/models';

const defaultAnthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const FREE_MODEL_ID =
  process.env.ANTHROPIC_FREE_MODEL ??
  process.env.ANTHROPIC_MODEL ??
  DEFAULT_FREE_MODEL;

const premiumModelEnv =
  process.env.ANTHROPIC_PREMIUM_MODELS ?? DEFAULT_PREMIUM_MODELS;

const parsedPremiumModels = premiumModelEnv
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);

if (
  process.env.ANTHROPIC_PREMIUM_MODELS &&
  parsedPremiumModels.length === 0
) {
  console.warn(
    '[ai] ANTHROPIC_PREMIUM_MODELS is set but parsed to an empty list. ' +
      `Falling back to DEFAULT_PREMIUM_MODEL (${DEFAULT_PREMIUM_MODEL}).`,
  );
}

export const PREMIUM_MODEL_OPTIONS =
  parsedPremiumModels.length > 0
    ? parsedPremiumModels
    : [DEFAULT_PREMIUM_MODEL];

export const DEFAULT_PREMIUM_MODEL_ID =
  process.env.ANTHROPIC_PREMIUM_MODEL ??
  PREMIUM_MODEL_OPTIONS[0] ??
  DEFAULT_PREMIUM_MODEL;

export const BYOK_MODEL_ID =
  process.env.ANTHROPIC_BYOK_MODEL ?? FREE_MODEL_ID;

/** Default OpenRouter model when an OpenRouter key is supplied without a model selection. */
export const DEFAULT_OPENROUTER_MODEL = OPENROUTER_MODELS.GPT_4O;

/**
 * Resolve a model ID + optional API key into a provider instance.
 *
 * Provider routing for BYOK:
 *   - No apiKey → platform Anthropic (direct)
 *   - sk-ant-* apiKey → direct Anthropic with user's key
 *   - sk-or-v1-* apiKey → OpenRouter with user's key
 *
 * @param modelId  - The model to use. 'byok' resolves based on provider.
 * @param apiKey   - Optional user-supplied API key (BYOK).
 * @param byokModelId - Optional model ID chosen by the user for BYOK (e.g. 'openai/gpt-4o').
 *                       Only used when apiKey is present.
 */
export const getModel = (
  modelId?: string,
  apiKey?: string,
  byokModelId?: string,
) => {
  // Platform-funded call (no user key)
  if (!apiKey) {
    const resolvedId =
      modelId === 'byok' ? BYOK_MODEL_ID : modelId ?? FREE_MODEL_ID;
    return defaultAnthropic(resolvedId);
  }

  // BYOK call — detect provider from key prefix
  const provider = detectProvider(apiKey);

  if (provider === 'openrouter') {
    const orProvider = createOpenRouter({ apiKey });
    // Use user-selected model, or default OpenRouter model
    const orModelId =
      byokModelId && ALL_OPENROUTER_MODEL_IDS.includes(byokModelId as typeof ALL_OPENROUTER_MODEL_IDS[number])
        ? byokModelId
        : DEFAULT_OPENROUTER_MODEL;
    return orProvider.chat(orModelId);
  }

  // Anthropic BYOK (default for sk-ant-* or unknown prefixes)
  const anthropicProvider = createAnthropic({ apiKey });
  // Validate the model ID against known Anthropic models, falling back to BYOK default.
  // This prevents invalid model IDs (e.g. OpenRouter IDs) from reaching the Anthropic API.
  const resolvedId =
    byokModelId && ALL_MODEL_IDS.includes(byokModelId as typeof ALL_MODEL_IDS[number])
      ? byokModelId
      : BYOK_MODEL_ID;
  return anthropicProvider(resolvedId);
};

// Re-export provider utilities for consumers that import from lib/ai.
// Consumers that need model data should import from @/lib/models directly.
export type { ByokProvider, OpenRouterModelId } from '@/lib/models';
export { isValidByokKey, isOpenRouterModel, OPENROUTER_MODEL_LABELS } from '@/lib/models';

// ---------------------------------------------------------------------------
// Context window limits (tokens)
// ---------------------------------------------------------------------------

/**
 * Maximum context window size for each model (in tokens).
 * Used by the bout engine to enforce prompt budgets and prevent
 * context overflow on long bouts.
 */
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  // Anthropic (direct)
  [MODEL_IDS.HAIKU]: 200_000,
  [MODEL_IDS.SONNET]: 200_000,
  [MODEL_IDS.OPUS_45]: 200_000,
  [MODEL_IDS.OPUS_46]: 200_000,
  // OpenRouter curated models
  [OPENROUTER_MODELS.GPT_4O]: 128_000,
  [OPENROUTER_MODELS.GPT_4O_MINI]: 128_000,
  [OPENROUTER_MODELS.GPT_4_1]: 1_047_576,
  [OPENROUTER_MODELS.O4_MINI]: 200_000,
  [OPENROUTER_MODELS.GEMINI_2_5_PRO]: 1_048_576,
  [OPENROUTER_MODELS.GEMINI_2_5_FLASH]: 1_048_576,
  [OPENROUTER_MODELS.LLAMA_4_MAVERICK]: 1_048_576,
  [OPENROUTER_MODELS.LLAMA_4_SCOUT]: 512_000,
  [OPENROUTER_MODELS.CLAUDE_SONNET_4]: 200_000,
  [OPENROUTER_MODELS.CLAUDE_HAIKU_4]: 200_000,
  [OPENROUTER_MODELS.DEEPSEEK_R1]: 128_000,
  [OPENROUTER_MODELS.DEEPSEEK_V3]: 128_000,
  [OPENROUTER_MODELS.MISTRAL_LARGE]: 128_000,
};

/** Default context limit for unknown models. Conservative to prevent overflows. */
export const DEFAULT_CONTEXT_LIMIT = 100_000;

/**
 * Fraction of the context window reserved for model output and safety margin.
 * The remaining budget (1 - this ratio) is the maximum input prompt size.
 */
export const CONTEXT_SAFETY_MARGIN = 0.15;

/**
 * Get the maximum input token budget for a given model.
 * Reserves CONTEXT_SAFETY_MARGIN of the window for output + safety.
 */
export function getInputTokenBudget(modelId: string): number {
  const limit = MODEL_CONTEXT_LIMITS[modelId] ?? DEFAULT_CONTEXT_LIMIT;
  return Math.floor(limit * (1 - CONTEXT_SAFETY_MARGIN));
}
