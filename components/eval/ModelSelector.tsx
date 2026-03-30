// Model selector dropdown sourced from MODEL_PRICING.
'use client';

import { MODEL_PRICING, type ModelPricing } from '@/lib/run/pricing';

type ModelSelectorProps = {
  value: string;
  onChange: (model: string) => void;
  id?: string;
};

const modelEntries: [string, ModelPricing][] = Object.entries(MODEL_PRICING);

function formatPrice(price: number): string {
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
      {modelEntries.map(([key, pricing]) => (
        <option key={key} value={key}>
          {key} (in: {formatPrice(pricing.inputPer1kTokens)}/1k, out:{' '}
          {formatPrice(pricing.outputPer1kTokens)}/1k)
        </option>
      ))}
    </select>
  );
}
