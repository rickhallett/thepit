'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

import { AgentIcon } from '@/components/agent-icon';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { useCopy } from '@/lib/copy-client';
import { FREE_MODEL_ID } from '@/lib/ai';
import { useByokModelPicker } from '@/lib/use-byok-model-picker';
import { DEFAULT_AGENT_COLOR } from '@/lib/presets';
import {
  RESPONSE_LENGTHS,
  DEFAULT_ARENA_RESPONSE_LENGTH,
} from '@/lib/response-lengths';
import {
  DEFAULT_RESPONSE_FORMAT,
  RESPONSE_FORMATS,
} from '@/lib/response-formats';

import type { AgentSnapshot } from '@/lib/agent-registry';

export type ArenaAgentOption = Pick<
  AgentSnapshot,
  'id' | 'name' | 'presetName' | 'color' | 'avatar'
>;

export function ArenaBuilder({
  agents,
  action,
  premiumEnabled = false,
  premiumModels = [],
  defaultPremiumModel,
  byokEnabled = false,
  initialAgentIds = [],
  initialTopic = '',
}: {
  agents: ArenaAgentOption[];
  action: (formData: FormData) => Promise<void>;
  premiumEnabled?: boolean;
  premiumModels?: string[];
  defaultPremiumModel?: string;
  byokEnabled?: boolean;
  initialAgentIds?: string[];
  initialTopic?: string;
}) {
  const c = useCopy();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>(
    // Only pre-select agents that actually exist in the pool
    initialAgentIds.filter((id) => agents.some((a) => a.id === id)),
  );
  const [selectedModel, setSelectedModel] = useState(
    defaultPremiumModel ?? premiumModels[0] ?? FREE_MODEL_ID,
  );
  const [byokKey, setByokKey] = useState('');
  const [byokError, setByokError] = useState<string | null>(null);
  const byokStashedRef = useRef(false);
  const {
    byokModel,
    setByokModel,
    byokModelOptions,
    resetIfProviderChanged,
  } = useByokModelPicker(byokKey);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((agent) => {
      return (
        agent.name.toLowerCase().includes(q) ||
        agent.id.toLowerCase().includes(q) ||
        agent.presetName?.toLowerCase().includes(q)
      );
    });
  }, [agents, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 6) return prev;
      return [...prev, id];
    });
  };

  const showModelSelector = premiumEnabled || byokEnabled;
  const modelOptions = [
    FREE_MODEL_ID,
    ...(premiumEnabled ? premiumModels : []),
    ...(byokEnabled ? ['byok'] : []),
  ].filter(Boolean);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    setByokError(null);
    if (!showModelSelector) return;
    if (selectedModel === 'byok') {
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
      byokStashedRef.current = true;
      trackEvent('byok_key_stashed');
      const form = event.target as HTMLFormElement;
      form.requestSubmit();
      return;
    }
  };

  return (
    <form action={action} onSubmit={handleSubmit} className="flex flex-col gap-8">
      <section className="border-2 border-foreground/60 bg-black/50 p-6">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          {c.arenaBuilderComponent.lineup.replace('{n}', String(selected.length))}
        </p>
        {selected.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            {c.arenaBuilderComponent.pickPrompt}
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {selected.map((id) => {
              const agent = agents.find((item) => item.id === id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  className="rounded-full border-2 border-foreground/50 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted transition hover:border-accent hover:text-accent"
                >
                  {agent?.name ?? id}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-6 border-2 border-foreground/60 bg-black/50 p-6">
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>{c.arenaBuilderComponent.topicLabel}</span>
          <input
            name="topic"
            type="text"
            defaultValue={initialTopic}
            placeholder={c.arenaBuilderComponent.topicPlaceholder}
            className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>{c.arenaBuilderComponent.responseLength}</span>
          <select
            name="length"
            defaultValue={DEFAULT_ARENA_RESPONSE_LENGTH}
            className="border-2 border-foreground/70 bg-black/60 px-3 py-2 pr-8 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
          >
            {RESPONSE_LENGTHS.map((length) => (
              <option key={length.id} value={length.id}>
                {length.label} · {length.hint}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>{c.arenaBuilderComponent.responseFormat}</span>
          <select
            name="format"
            defaultValue={DEFAULT_RESPONSE_FORMAT}
            className="border-2 border-foreground/70 bg-black/60 px-3 py-2 pr-8 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
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
            <span>{c.arenaBuilderComponent.model}</span>
            <select
              name="model"
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              className="border-2 border-foreground/70 bg-black/60 px-3 py-2 pr-8 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
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
              <span>{c.arenaBuilderComponent.byokLabel}</span>
              <input
                type="password"
                autoComplete="off"
                value={byokKey}
                onChange={(event) => {
                  setByokKey(event.target.value);
                  resetIfProviderChanged(event.target.value);
                }}
                placeholder={c.presetCard.byokPlaceholder}
                className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
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
                  className="border-2 border-foreground/70 bg-black/60 px-3 py-2 pr-8 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
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
        {selected.map((id) => (
          <input key={id} type="hidden" name="agentIds" value={id} />
        ))}
        <SignedIn>
          <button
            type="submit"
            disabled={selected.length < 2}
            className={cn(
              'rounded-full border-2 px-4 py-3 text-xs uppercase tracking-[0.3em] transition',
              selected.length < 2
                ? 'border-foreground/30 text-muted'
                : 'border-accent text-accent hover:bg-accent hover:text-background',
            )}
          >
            {c.arenaBuilderComponent.launchBout}
          </button>
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-full border-2 border-accent/70 px-4 py-3 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background"
            >
              {c.arenaBuilderComponent.signInToLaunch}
            </button>
          </SignInButton>
        </SignedOut>
      </section>

      <section className="border-2 border-foreground/60 bg-black/50 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
            <span>Search agents</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={c.arenaBuilderComponent.searchPlaceholder}
              className="w-64 border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
            />
          </label>
          <span className="ml-auto text-[10px] uppercase tracking-[0.3em] text-muted">
            {c.arenaBuilderComponent.agentsCount.replace('{n}', String(filtered.length))}
          </span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filtered.map((agent) => {
            const isSelected = selected.includes(agent.id);
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => toggle(agent.id)}
                className={cn(
                  'flex items-center justify-between border-2 border-foreground/50 bg-black/60 p-4 text-left transition hover:border-accent',
                  isSelected && 'border-accent text-accent',
                )}
              >
                <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm uppercase tracking-[0.25em]">
                    <AgentIcon avatar={agent.avatar} size={14} className="shrink-0" />
                    {agent.name}
                </p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted">
                    {agent.presetName ?? c.arenaBuilderComponent.custom}
                  </p>
                </div>
                <span
                  className="max-w-[120px] shrink-0 truncate rounded-full border-2 px-3 py-1 text-[10px] uppercase tracking-[0.25em]"
                  style={{
                    borderColor: agent.color ?? DEFAULT_AGENT_COLOR,
                    color: agent.color ?? DEFAULT_AGENT_COLOR,
                  }}
                >
                  {isSelected ? c.arenaBuilderComponent.selected : c.arenaBuilderComponent.pick}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </form>
  );
}
