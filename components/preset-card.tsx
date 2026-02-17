'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useFormStatus } from 'react-dom';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

import { FREE_MODEL_ID } from '@/lib/ai';
import { trackEvent } from '@/lib/analytics';
import { useCopy } from '@/lib/copy-client';
import {
  CREDITS_ENABLED,
  estimateBoutCostGbp,
  formatCredits,
  toMicroCredits,
} from '@/lib/credits';
import {
  labelForModel,
  useByokModelPicker,
} from '@/lib/use-byok-model-picker';
import type { Preset } from '@/lib/presets';
import {
  DEFAULT_RESPONSE_LENGTH,
  RESPONSE_LENGTHS,
} from '@/lib/response-lengths';
import {
  DEFAULT_RESPONSE_FORMAT,
  RESPONSE_FORMATS,
} from '@/lib/response-formats';

function SubmitButton({ locked }: { locked: boolean }) {
  const { pending } = useFormStatus();
  const c = useCopy();
  return (
    <button
      type="submit"
      disabled={locked || pending}
      className="rounded-full border-2 border-accent/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background disabled:opacity-50"
    >
      {locked ? c.presetCard.locked : pending ? c.presetCard.starting : c.presetCard.enterThePit}
    </button>
  );
}

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
  const c = useCopy();
  const showInput = Boolean(preset.requiresInput || preset.inputLabel);
  const isPremium = preset.tier === 'premium';
  const showModelSelector =
    byokEnabled || (isPremium && premiumEnabled && premiumModels.length > 0);
  const creditsEnabled = CREDITS_ENABLED;
  const defaultModel =
    isPremium && premiumEnabled
      ? defaultPremiumModel ?? premiumModels[0] ?? FREE_MODEL_ID
      : FREE_MODEL_ID;
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [byokKey, setByokKey] = useState('');
  const [byokError, setByokError] = useState<string | null>(null);
  const byokStashedRef = useRef(false);
  const {
    byokModel,
    setByokModel,
    byokModelOptions,
    resetIfProviderChanged,
  } = useByokModelPicker(byokKey);

  const estimateCreditsForModel = (modelId: string) => {
    const micro = toMicroCredits(estimateBoutCostGbp(preset.maxTurns, modelId));
    return formatCredits(micro);
  };

  const modelOptions = isPremium ? [...premiumModels] : [FREE_MODEL_ID];
  if (byokEnabled && (isPremium ? premiumEnabled : true)) {
    modelOptions.push('byok');
  }

  const estimateModels = isPremium
    ? [
        ...premiumModels,
        ...(byokEnabled && premiumEnabled ? ['byok'] : []),
      ]
    : [...modelOptions];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    if (locked) return;
    setByokError(null);
    trackEvent('preset_selected', { presetId: preset.id, model: selectedModel });
    if (!showModelSelector) return;
    if (selectedModel === 'byok') {
      // If we already stashed the key, allow the form to submit normally
      if (byokStashedRef.current) {
        byokStashedRef.current = false;
        return;
      }
      const trimmed = byokKey.trim();
      if (!trimmed) {
        event.preventDefault();
        setByokError(c.presetCard.byokRequired);
        return;
      }
      // Stash key in HTTP-only cookie (eliminates sessionStorage XSS window)
      event.preventDefault();
      try {
        const res = await fetch('/api/byok-stash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: trimmed,
            ...(byokModel ? { model: byokModel } : {}),
          }),
        });
        if (!res.ok) {
          setByokError(c.presetCard.byokFailed);
          return;
        }
      } catch {
        setByokError(c.presetCard.byokFailed);
        return;
      }
      // Re-submit the form now that the key is stashed
      byokStashedRef.current = true;
      trackEvent('byok_key_stashed');
      const form = event.target as HTMLFormElement;
      form.requestSubmit();
      return;
    }
  };

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
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
              {c.presetCard.premium}
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
        <SignedIn>
          <SubmitButton locked={locked} />
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-full border-2 border-accent/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background"
            >
              {c.presetCard.signInToPlay}
            </button>
          </SignInButton>
        </SignedOut>
      </div>

      {locked && isPremium && (
        <div className="rounded border border-accent/50 px-3 py-2 text-xs uppercase tracking-[0.3em] text-accent/80">
          {c.presetCard.premiumRequired}
        </div>
      )}

      {showInput && (
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>{preset.inputLabel ?? c.presetCard.topicLabel}</span>
          <input
            name="topic"
            type="text"
            placeholder={preset.inputExamples?.[0] ?? c.presetCard.topicPlaceholder}
            className="w-full border-2 border-foreground/70 bg-black/60 px-3 py-2 text-sm uppercase tracking-[0.15em] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            required={preset.requiresInput}
            disabled={locked}
          />
        </label>
      )}

      <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
        <span>{c.presetCard.responseLength}</span>
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
        <span>{c.presetCard.responseFormat}</span>
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
          <span>{c.presetCard.model}</span>
          <select
            name="model"
            value={selectedModel}
            onChange={(event) => setSelectedModel(event.target.value)}
            className="w-full border-2 border-foreground/70 bg-black/60 px-3 py-2 pr-8 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
            disabled={locked}
          >
            {modelOptions.map((model) => (
              <option key={model} value={model}>
                {model === 'byok' ? 'BYOK' : model}
              </option>
            ))}
          </select>
        </label>
      )}
      {showModelSelector && selectedModel === 'byok' && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
            <span>{c.presetCard.byokLabel}</span>
            <input
              type="password"
              autoComplete="off"
              value={byokKey}
              onChange={(event) => {
                setByokKey(event.target.value);
                resetIfProviderChanged(event.target.value);
              }}
              placeholder={c.presetCard.byokPlaceholder}
              className="w-full border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
              disabled={locked}
              required
            />
            <span className="text-[10px] normal-case tracking-normal text-muted/70">
              {c.presetCard.byokPrivacy}{' '}
              <a
                href="https://github.com/rickhallett/thepit/blob/master/app/api/byok-stash/route.ts"
                target="_blank"
                rel="noreferrer"
                className="underline transition hover:text-accent"
              >
                {c.presetCard.verify}
              </a>
            </span>
            {byokError && (
              <span className="text-[10px] uppercase tracking-[0.25em] text-red-400">
                {byokError}
              </span>
            )}
          </label>
          {byokModelOptions.length > 0 && (
            <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
              <span>{c.presetCard.byokModelLabel}</span>
              <select
                value={byokModel}
                onChange={(event) => setByokModel(event.target.value)}
                className="w-full border-2 border-foreground/70 bg-black/60 px-3 py-2 pr-8 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
                disabled={locked}
              >
                <option value="">{c.presetCard.byokModelDefault}</option>
                {byokModelOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
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
        {c.presetCard.maxTurns.replace('{n}', String(preset.maxTurns))}
      </p>
    </form>
  );
}
