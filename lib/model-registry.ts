// lib/model-registry.ts
// Single source of truth for all LLM model metadata.
//
// Default models are hardcoded below. The full registry can be
// overridden at startup via MODEL_REGISTRY_JSON env var.

export type ModelTier = 'free' | 'premium';

export type ModelEntry = {
  id: string;
  label: string;
  tier: ModelTier;
  contextWindow: number;
  pricing: { in: number; out: number }; // GBP per million tokens
};

export const DEFAULT_CONTEXT_WINDOW = 100_000;
export const CONTEXT_SAFETY_MARGIN = 0.15;

const DEFAULT_REGISTRY: ModelEntry[] = [
  // Free tier
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', tier: 'free', contextWindow: 128_000, pricing: { in: 0.15, out: 0.60 } },
  { id: 'google/gemini-2.5-flash-preview', label: 'Gemini 2.5 Flash', tier: 'free', contextWindow: 1_048_576, pricing: { in: 0.15, out: 0.60 } },
  { id: 'anthropic/claude-haiku-4', label: 'Claude Haiku 4.5', tier: 'free', contextWindow: 200_000, pricing: { in: 1.00, out: 5.00 } },
  // Premium tier
  { id: 'openai/gpt-5.4', label: 'GPT-5.4', tier: 'premium', contextWindow: 1_000_000, pricing: { in: 2.50, out: 10.00 } },
  { id: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet 4.6', tier: 'premium', contextWindow: 200_000, pricing: { in: 3.00, out: 15.00 } },
  { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash', tier: 'premium', contextWindow: 1_048_576, pricing: { in: 0.50, out: 2.00 } },
  { id: 'deepseek/deepseek-v3.2', label: 'DeepSeek V3.2', tier: 'premium', contextWindow: 128_000, pricing: { in: 0.27, out: 1.10 } },
  { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1', tier: 'premium', contextWindow: 128_000, pricing: { in: 0.55, out: 2.19 } },
  { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick', tier: 'premium', contextWindow: 1_048_576, pricing: { in: 0.20, out: 0.60 } },
  { id: 'openai/gpt-4o', label: 'GPT-4o', tier: 'premium', contextWindow: 128_000, pricing: { in: 2.50, out: 10.00 } },
  { id: 'openai/o4-mini', label: 'o4 Mini', tier: 'premium', contextWindow: 200_000, pricing: { in: 1.10, out: 4.40 } },
];

function loadRegistry(): ModelEntry[] {
  const envJson = process.env.MODEL_REGISTRY_JSON;
  if (envJson) {
    try {
      return JSON.parse(envJson) as ModelEntry[];
    } catch {
      console.error('[model-registry] MODEL_REGISTRY_JSON is invalid JSON, using defaults');
    }
  }
  return [...DEFAULT_REGISTRY];
}

let _registry: ModelEntry[] | null = null;

export function getRegistry(): ModelEntry[] {
  if (!_registry) _registry = loadRegistry();
  return _registry;
}

/** Reset cached registry (for testing). */
export function _resetRegistry(): void {
  _registry = null;
}

export function getModelEntry(modelId: string): ModelEntry | undefined {
  return getRegistry().find((m) => m.id === modelId);
}

export function getModelsByTier(tier: ModelTier): ModelEntry[] {
  return getRegistry().filter((m) => m.tier === tier);
}

export function getAllModelIds(): string[] {
  return getRegistry().map((m) => m.id);
}

export function isValidModelId(modelId: string): boolean {
  return getRegistry().some((m) => m.id === modelId);
}

export function getModelLabel(modelId: string): string {
  return getModelEntry(modelId)?.label ?? modelId;
}

export function getContextWindow(modelId: string): number {
  return getModelEntry(modelId)?.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
}

export function getInputTokenBudget(modelId: string): number {
  return Math.floor(getContextWindow(modelId) * (1 - CONTEXT_SAFETY_MARGIN));
}

export function getModelPricing(modelId: string): { in: number; out: number } {
  const entry = getModelEntry(modelId);
  if (entry) return entry.pricing;
  const cheapest = getModelsByTier('free').sort((a, b) => a.pricing.in - b.pricing.in)[0];
  return cheapest?.pricing ?? { in: 1, out: 5 };
}

export const FREE_MODEL_IDS = getModelsByTier('free').map((m) => m.id);
export const PREMIUM_MODEL_IDS = getModelsByTier('premium').map((m) => m.id);
export const ALL_MODEL_IDS_LIST = getAllModelIds();
export const DEFAULT_FREE_MODEL = FREE_MODEL_IDS[0]!;
export const DEFAULT_PREMIUM_MODEL = PREMIUM_MODEL_IDS[0]!;
