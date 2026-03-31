// Model pricing table and cost computation (M3.1).
//
// Pure data module. No imports except types. No side effects.
// Prices in dollars per 1k tokens. Updated manually.

export type ModelPricing = {
  inputPer1kTokens: number;
  outputPer1kTokens: number;
};

export type ModelEntry = ModelPricing & {
  provider: 'anthropic' | 'openai' | 'google';
  label: string;
  tier: 'small' | 'medium' | 'large';
};

export const MODEL_PRICING: Record<string, ModelEntry> = {
  // Anthropic
  'claude-haiku-4-5-20251001':  { provider: 'anthropic', label: 'Claude Haiku 4.5',  tier: 'small',  inputPer1kTokens: 0.0008,  outputPer1kTokens: 0.004 },
  'claude-sonnet-4-5-20250929': { provider: 'anthropic', label: 'Claude Sonnet 4.5', tier: 'medium', inputPer1kTokens: 0.003,   outputPer1kTokens: 0.015 },
  'claude-sonnet-4-20250514':   { provider: 'anthropic', label: 'Claude Sonnet 4',   tier: 'medium', inputPer1kTokens: 0.003,   outputPer1kTokens: 0.015 },
  'claude-opus-4-20250514':     { provider: 'anthropic', label: 'Claude Opus 4',     tier: 'large',  inputPer1kTokens: 0.015,   outputPer1kTokens: 0.075 },

  // OpenAI
  'gpt-4o-mini':       { provider: 'openai', label: 'GPT-4o Mini',   tier: 'small',  inputPer1kTokens: 0.00015, outputPer1kTokens: 0.0006 },
  'gpt-4o':            { provider: 'openai', label: 'GPT-4o',        tier: 'medium', inputPer1kTokens: 0.0025,  outputPer1kTokens: 0.01 },
  'o4-mini':           { provider: 'openai', label: 'o4-mini',       tier: 'medium', inputPer1kTokens: 0.0011,  outputPer1kTokens: 0.0044 },
  'gpt-4.1':           { provider: 'openai', label: 'GPT-4.1',      tier: 'large',  inputPer1kTokens: 0.002,   outputPer1kTokens: 0.008 },

  // Google
  'gemini-2.0-flash':  { provider: 'google', label: 'Gemini 2.0 Flash', tier: 'small',  inputPer1kTokens: 0.0001,  outputPer1kTokens: 0.0004 },
  'gemini-2.5-flash':  { provider: 'google', label: 'Gemini 2.5 Flash', tier: 'medium', inputPer1kTokens: 0.00015, outputPer1kTokens: 0.001 },
  'gemini-2.5-pro':    { provider: 'google', label: 'Gemini 2.5 Pro',   tier: 'large',  inputPer1kTokens: 0.00125, outputPer1kTokens: 0.01 },
};

export function getModelPricing(model: string): ModelPricing | null {
  return MODEL_PRICING[model] ?? null;
}

export function computeCostMicro(
  model: string,
  inputTokens: number,
  outputTokens: number,
): { inputCostMicro: number; outputCostMicro: number; totalCostMicro: number } | null {
  const pricing = getModelPricing(model);
  if (!pricing) return null;
  const inputCostMicro = Math.round((inputTokens / 1000) * pricing.inputPer1kTokens * 1_000_000);
  const outputCostMicro = Math.round((outputTokens / 1000) * pricing.outputPer1kTokens * 1_000_000);
  return {
    inputCostMicro,
    outputCostMicro,
    totalCostMicro: inputCostMicro + outputCostMicro,
  };
}
