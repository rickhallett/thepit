import { createAnthropic } from '@ai-sdk/anthropic';

const defaultAnthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const FREE_MODEL_ID =
  process.env.ANTHROPIC_FREE_MODEL ??
  process.env.ANTHROPIC_MODEL ??
  'claude-haiku-4-5-20251001';

const premiumModelEnv =
  process.env.ANTHROPIC_PREMIUM_MODELS ??
  'claude-sonnet-4-5-20250929,claude-opus-4-5-20251101';

export const PREMIUM_MODEL_OPTIONS = premiumModelEnv
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);

export const DEFAULT_PREMIUM_MODEL_ID =
  process.env.ANTHROPIC_PREMIUM_MODEL ??
  PREMIUM_MODEL_OPTIONS[0] ??
  FREE_MODEL_ID;

export const BYOK_MODEL_ID =
  process.env.ANTHROPIC_BYOK_MODEL ?? FREE_MODEL_ID;

export const getModel = (modelId?: string, apiKey?: string) => {
  const provider = apiKey ? createAnthropic({ apiKey }) : defaultAnthropic;
  const resolvedId =
    modelId === 'byok' ? BYOK_MODEL_ID : modelId ?? FREE_MODEL_ID;
  return provider(resolvedId);
};
