import { FREE_MODEL_ID } from '@/lib/ai';
import {
  CREDITS_ENABLED,
  estimateBoutCostGbp,
  formatCredits,
  toMicroCredits,
} from '@/lib/credits';
import type { Preset } from '@/lib/presets';
import {
  DEFAULT_RESPONSE_LENGTH,
  RESPONSE_LENGTHS,
} from '@/lib/response-lengths';
import {
  DEFAULT_RESPONSE_FORMAT,
  RESPONSE_FORMATS,
} from '@/lib/response-formats';

export function PresetCard({
  preset,
  action,
  locked = false,
  premiumEnabled = false,
  premiumModels = [],
  defaultPremiumModel,
  byokEnabled = false,
}: {
  preset: Preset;
  action: (formData: FormData) => Promise<void>;
  locked?: boolean;
  premiumEnabled?: boolean;
  premiumModels?: string[];
  defaultPremiumModel?: string;
  byokEnabled?: boolean;
}) {
  const showInput = Boolean(preset.requiresInput || preset.inputLabel);
  const isPremium = preset.tier === 'premium';
  const showModelSelector = isPremium && premiumEnabled && premiumModels.length > 0;
  const creditsEnabled = CREDITS_ENABLED;

  const estimateCreditsForModel = (modelId: string) => {
    const micro = toMicroCredits(estimateBoutCostGbp(preset.maxTurns, modelId));
    return formatCredits(micro);
  };

  const labelForModel = (modelId: string) => {
    if (modelId === 'byok') return 'BYOK';
    if (modelId.includes('haiku')) return 'Haiku';
    if (modelId.includes('sonnet')) return 'Sonnet';
    if (modelId.includes('opus')) return 'Opus';
    return modelId;
  };

  const estimateModels = isPremium
    ? [
        ...premiumModels,
        ...(byokEnabled && premiumEnabled ? ['byok'] : []),
      ]
    : [FREE_MODEL_ID];

  return (
    <form
      action={action}
      className="group flex h-full flex-col gap-6 border-2 border-foreground/80 bg-black/60 p-6 shadow-[8px_8px_0_rgba(255,255,255,0.15)] transition hover:-translate-y-1"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted">
            Preset
          </p>
          <h3 className="mt-2 font-sans text-2xl uppercase tracking-tight">
            {preset.name}
          </h3>
          {isPremium && (
            <span className="mt-3 inline-flex items-center rounded-full border-2 border-accent/70 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-accent">
              Premium
            </span>
          )}
          {preset.description && (
            <p className="mt-3 max-w-sm text-xs text-muted">
              {preset.description}
            </p>
          )}
          {preset.group && (
            <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted">
              {preset.group}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={locked}
          className="rounded-full border-2 border-foreground/70 px-4 py-2 text-xs uppercase tracking-[0.3em] transition hover:border-accent hover:text-accent"
        >
          {locked ? 'Locked' : 'Enter'}
        </button>
      </div>

      {locked && isPremium && (
        <div className="rounded border border-accent/50 px-3 py-2 text-xs uppercase tracking-[0.3em] text-accent/80">
          Premium required
        </div>
      )}

      {showInput && (
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>{preset.inputLabel ?? 'Enter topic'}</span>
          <input
            name="topic"
            type="text"
            placeholder={preset.inputExamples?.[0] ?? 'Your topic here'}
            className="w-full border-2 border-foreground/70 bg-black/60 px-3 py-2 text-sm uppercase tracking-[0.15em] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            required={preset.requiresInput}
            disabled={locked}
          />
        </label>
      )}

      <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
        <span>Response length</span>
        <select
          name="length"
          defaultValue={DEFAULT_RESPONSE_LENGTH}
          className="w-full border-2 border-foreground/70 bg-black/60 px-3 py-2 pr-8 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
          disabled={locked}
        >
          {RESPONSE_LENGTHS.map((length) => (
            <option key={length.id} value={length.id}>
              {length.label} · {length.hint}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
        <span>Response format</span>
        <select
          name="format"
          defaultValue={DEFAULT_RESPONSE_FORMAT}
          className="w-full border-2 border-foreground/70 bg-black/60 px-3 py-2 pr-8 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
          disabled={locked}
        >
          {RESPONSE_FORMATS.map((format) => (
            <option key={format.id} value={format.id}>
              {format.label} · {format.hint}
            </option>
          ))}
        </select>
      </label>

      {showModelSelector && (
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>Model</span>
          <select
            name="model"
            defaultValue={defaultPremiumModel ?? premiumModels[0]}
            className="w-full border-2 border-foreground/70 bg-black/60 px-3 py-2 pr-8 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
          >
            {premiumModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
            {byokEnabled && <option value="byok">BYOK</option>}
          </select>
        </label>
      )}

      {creditsEnabled && (
        <div
          className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.25em] text-muted"
          title="Estimated credits per bout (standard length)"
        >
          {estimateModels.map((modelId) => (
            <span
              key={`${preset.id}-${modelId}`}
              className="rounded-full border border-foreground/40 px-3 py-1"
            >
              {labelForModel(modelId)} {estimateCreditsForModel(modelId)} cr
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em]">
        {preset.agents.map((agent) => (
          <span
            key={agent.id}
            className="rounded-full border-2 px-3 py-1"
            style={{ borderColor: agent.color, color: agent.color }}
          >
            {agent.name}
          </span>
        ))}
      </div>

      <p className="text-sm text-muted">
        Max turns: <span className="text-foreground">{preset.maxTurns}</span>
      </p>
    </form>
  );
}
