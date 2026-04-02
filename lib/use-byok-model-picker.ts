'use client';

import { useState } from 'react';

import { isValidByokKey } from '@/lib/models';
import {
  getRegistry,
  getModelLabel,
  type ModelEntry,
} from '@/lib/model-registry';

export type ByokModelOption = { id: string; label: string };

/**
 * Human-readable label for any model ID.
 */
export function labelForModel(modelId: string): string {
  if (modelId === 'byok') return 'BYOK';
  return getModelLabel(modelId);
}

/**
 * Shared hook for BYOK model selection.
 * All BYOK uses OpenRouter -- shows the full model registry.
 */
export function useByokModelPicker(byokKey: string) {
  const [byokModel, setByokModel] = useState('');

  const trimmedKey = byokKey.trim();
  const isValid = trimmedKey ? isValidByokKey(trimmedKey) : false;

  const byokModelOptions: ByokModelOption[] = isValid
    ? getRegistry().map((m: ModelEntry) => ({ id: m.id, label: m.label }))
    : [];

  const resetIfProviderChanged = (_newKey: string) => {
    if (!isValidByokKey(_newKey.trim())) {
      setByokModel('');
    }
  };

  return {
    byokModel,
    setByokModel,
    detectedProvider: isValid ? ('openrouter' as const) : undefined,
    byokModelOptions,
    resetIfProviderChanged,
  };
}
