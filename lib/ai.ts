// Anthropic model provider configuration and resolution.
//
// Three model tiers:
//   - Free:    Haiku (cheapest, used for free-tier presets and share line generation)
//   - Premium: Sonnet/Opus (used for premium presets and arena mode)
//   - BYOK:    User-supplied API key with platform's chosen model
//
// The getModel() function resolves a model ID + optional API key into a
// provider instance. When modelId is 'byok', it creates a fresh Anthropic
// provider using the user's key instead of the platform's default.
//
// When HELICONE_API_KEY is set, all platform-funded AI calls are routed
// through Helicone's proxy for cost/latency/token analytics. BYOK calls
// bypass Helicone since we don't proxy user-supplied keys.

import { createAnthropic } from '@ai-sdk/anthropic';

import {
  MODEL_IDS,
  DEFAULT_FREE_MODEL,
  DEFAULT_PREMIUM_MODELS,
  DEFAULT_PREMIUM_MODEL,
} from '@/lib/models';

const HELICONE_API_KEY = process.env.HELICONE_API_KEY;
const HELICONE_ENABLED = process.env.HELICONE_ENABLED === 'true';
const HELICONE_BASE_URL = 'https://anthropic.helicone.ai/v1';

const useHelicone = HELICONE_ENABLED && !!HELICONE_API_KEY;

const defaultAnthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  ...(useHelicone
    ? {
        baseURL: HELICONE_BASE_URL,
        headers: {
          'Helicone-Auth': `Bearer ${HELICONE_API_KEY}`,
          'Helicone-Property-Service': 'tspit',
        },
      }
    : {}),
});

export const FREE_MODEL_ID =
  process.env.ANTHROPIC_FREE_MODEL ??
  process.env.ANTHROPIC_MODEL ??
  DEFAULT_FREE_MODEL;

const premiumModelEnv =
  process.env.ANTHROPIC_PREMIUM_MODELS ?? DEFAULT_PREMIUM_MODELS;

export const PREMIUM_MODEL_OPTIONS = premiumModelEnv
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);

export const DEFAULT_PREMIUM_MODEL_ID =
  process.env.ANTHROPIC_PREMIUM_MODEL ??
  PREMIUM_MODEL_OPTIONS[0] ??
  DEFAULT_PREMIUM_MODEL;

export const BYOK_MODEL_ID =
  process.env.ANTHROPIC_BYOK_MODEL ?? FREE_MODEL_ID;

export const getModel = (modelId?: string, apiKey?: string) => {
  const provider = apiKey ? createAnthropic({ apiKey }) : defaultAnthropic;
  const resolvedId =
    modelId === 'byok' ? BYOK_MODEL_ID : modelId ?? FREE_MODEL_ID;
  return provider(resolvedId);
};

// ---------------------------------------------------------------------------
// Context window limits (tokens)
// ---------------------------------------------------------------------------

/**
 * Maximum context window size for each model (in tokens).
 * Used by the bout engine to enforce prompt budgets and prevent
 * context overflow on long bouts.
 */
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  [MODEL_IDS.HAIKU]: 200_000,
  [MODEL_IDS.SONNET]: 200_000,
  [MODEL_IDS.OPUS_45]: 200_000,
  [MODEL_IDS.OPUS_46]: 200_000,
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
