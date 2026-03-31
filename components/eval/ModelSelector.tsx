// Model selector dropdown grouped by provider, sourced from MODEL_PRICING.
'use client';

import { MODEL_PRICING, type ModelEntry } from '@/lib/run/pricing';

type ModelSelectorProps = {
  value: string;
  onChange: (model: string) => void;
  id?: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
};

const PROVIDER_ORDER = ['anthropic', 'openai', 'google'] as const;

type GroupedModels = Record<string, [string, ModelEntry][]>;

const grouped: GroupedModels = {};
for (const [id, entry] of Object.entries(MODEL_PRICING)) {
  const group = entry.provider;
  if (!grouped[group]) grouped[group] = [];
  grouped[group].push([id, entry]);
}

function formatPrice(price: number): string {
  if (price < 0.001) return `$${price.toFixed(5)}`;
  return `$${price.toFixed(4)}`;
}

export function ModelSelector({ value, onChange, id }: ModelSelectorProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground transition focus:border-accent focus:outline-none"
    >
      <option value="">Select a model</option>
      {PROVIDER_ORDER.map((provider) => {
        const models = grouped[provider];
        if (!models || models.length === 0) return null;
        return (
          <optgroup key={provider} label={PROVIDER_LABELS[provider] ?? provider}>
            {models.map(([modelId, entry]) => (
              <option key={modelId} value={modelId}>
                {entry.label} (in: {formatPrice(entry.inputPer1kTokens)}/1k, out: {formatPrice(entry.outputPer1kTokens)}/1k)
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
