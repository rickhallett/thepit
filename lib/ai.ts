// lib/ai.ts
// AI model provider configuration and resolution.
//
// Single provider: all calls route through OpenRouter.
//   - Platform-funded: uses OPENROUTER_API_KEY from env
//   - BYOK: uses user-supplied OpenRouter key

import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import { env } from '@/lib/env';

const platformProvider = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

/**
 * Resolve a model ID + optional BYOK key into a provider instance.
 */
export function getModel(modelId: string, byokApiKey?: string) {
  if (byokApiKey) {
    return createOpenRouter({ apiKey: byokApiKey }).chat(modelId);
  }
  return platformProvider.chat(modelId);
}

/**
 * Whether a model ID targets an Anthropic model (for provider-specific
 * options like prompt caching). OpenRouter passes these through.
 */
export function isAnthropicModel(modelId: string): boolean {
  return modelId.startsWith('anthropic/');
}

// Re-export from model-registry for consumers that import from lib/ai
export { getInputTokenBudget, DEFAULT_FREE_MODEL, CONTEXT_SAFETY_MARGIN } from '@/lib/model-registry';
