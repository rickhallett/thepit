// Model pricing table and cost computation (M3.1).
//
// Pure data module. No imports except types. No side effects.
// Prices in dollars per 1k tokens. Updated manually.

export type ModelPricing = {
  inputPer1kTokens: number;
  outputPer1kTokens: number;
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o':            { inputPer1kTokens: 0.0025,  outputPer1kTokens: 0.01 },
  'gpt-4o-mini':       { inputPer1kTokens: 0.00015, outputPer1kTokens: 0.0006 },
  'claude-sonnet-4-20250514': { inputPer1kTokens: 0.003,  outputPer1kTokens: 0.015 },
  'claude-haiku-3.5':  { inputPer1kTokens: 0.0008,  outputPer1kTokens: 0.004 },
  'gemini-2.0-flash':  { inputPer1kTokens: 0.0001,  outputPer1kTokens: 0.0004 },
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
