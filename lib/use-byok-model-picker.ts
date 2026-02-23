'use client';

import { useState } from 'react';

import {
  ALL_MODEL_IDS,
  ALL_OPENROUTER_MODEL_IDS,
  type ByokProvider,
  detectProvider,
  OPENROUTER_MODEL_LABELS,
  type OpenRouterModelId,
} from '@/lib/models';

export type ByokModelOption = { id: string; label: string };

/**
 * Human-readable label for an Anthropic model ID.
 * Used in both the BYOK model picker and credit-estimate badges.
 */
export function labelForModel(modelId: string): string {
  if (modelId === 'byok') return 'BYOK';
  if (modelId.includes('haiku')) return 'Haiku';
  if (modelId.includes('sonnet-4-6')) return 'Sonnet 4.6';
  if (modelId.includes('sonnet')) return 'Sonnet 4.5';
  return modelId;
}

/**
 * Shared hook for BYOK model selection.
 *
 * Detects the provider from the API key prefix and returns
 * provider-appropriate model options for the dropdown.
 *
 * Usage:
 *   const { byokModel, setByokModel, detectedProvider, byokModelOptions, handleKeyChange }
 *     = useByokModelPicker();
 */
export function useByokModelPicker(byokKey: string) {
  const [byokModel, setByokModel] = useState('');

  const trimmedKey = byokKey.trim();
  const detectedProvider: ByokProvider | undefined = trimmedKey
    ? detectProvider(trimmedKey)
    : undefined;

  const byokModelOptions: ByokModelOption[] =
    detectedProvider === 'openrouter'
      ? ALL_OPENROUTER_MODEL_IDS.map((id) => ({
          id,
          label: OPENROUTER_MODEL_LABELS[id as OpenRouterModelId],
        }))
      : detectedProvider === 'anthropic'
        ? ALL_MODEL_IDS.map((id) => ({
            id,
            label: labelForModel(id),
          }))
        : [];

  /**
   * Call this when the key input changes.
   * Resets model selection when the detected provider changes.
   */
  const resetIfProviderChanged = (newKey: string) => {
    const newProvider = detectProvider(newKey.trim());
    if (newProvider !== detectedProvider) {
      setByokModel('');
    }
  };

  return {
    byokModel,
    setByokModel,
    detectedProvider,
    byokModelOptions,
    resetIfProviderChanged,
  };
}
