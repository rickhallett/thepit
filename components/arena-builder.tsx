'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { cn } from '@/lib/cn';
import { FREE_MODEL_ID } from '@/lib/ai';
import {
  RESPONSE_LENGTHS,
  DEFAULT_RESPONSE_LENGTH,
} from '@/lib/response-lengths';
import {
  DEFAULT_RESPONSE_FORMAT,
  RESPONSE_FORMATS,
} from '@/lib/response-formats';

export type ArenaAgentOption = {
  id: string;
  name: string;
  presetName?: string | null;
  color?: string;
  avatar?: string;
};

export function ArenaBuilder({
  agents,
  action,
  premiumEnabled = false,
  premiumModels = [],
  defaultPremiumModel,
  byokEnabled = false,
}: {
  agents: ArenaAgentOption[];
  action: (formData: FormData) => Promise<void>;
  premiumEnabled?: boolean;
  premiumModels?: string[];
  defaultPremiumModel?: string;
  byokEnabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(
    defaultPremiumModel ?? premiumModels[0] ?? FREE_MODEL_ID,
  );
  const [byokKey, setByokKey] = useState('');
  const [byokError, setByokError] = useState<string | null>(null);

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    setByokError(null);
    if (!showModelSelector) {
      sessionStorage.removeItem('pit_byok_key');
      return;
    }
    if (selectedModel === 'byok') {
      const trimmed = byokKey.trim();
      if (!trimmed) {
        event.preventDefault();
        setByokError('BYOK key required.');
        return;
      }
      sessionStorage.setItem('pit_byok_key', trimmed);
      return;
    }
    sessionStorage.removeItem('pit_byok_key');
  };

  return (
    <form action={action} onSubmit={handleSubmit} className="flex flex-col gap-8">
      <section className="border-2 border-foreground/60 bg-black/50 p-6">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          Lineup ({selected.length}/6)
        </p>
        {selected.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Pick 2-6 agents to enter the arena.
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
          <span>Topic (optional)</span>
          <input
            name="topic"
            type="text"
            placeholder="What should they fight about?"
            className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>Response length</span>
          <select
            name="length"
            defaultValue={DEFAULT_RESPONSE_LENGTH}
            className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
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
            className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
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
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
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
          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
            <span>BYOK API key</span>
            <input
              name="byokKey"
              type="password"
              value={byokKey}
              onChange={(event) => setByokKey(event.target.value)}
              placeholder="sk-ant-..."
              className="border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
              required
            />
            {byokError && (
              <span className="text-[10px] uppercase tracking-[0.25em] text-red-400">
                {byokError}
              </span>
            )}
          </label>
        )}
        {selected.map((id) => (
          <input key={id} type="hidden" name="agentIds" value={id} />
        ))}
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
          Launch arena bout
        </button>
      </section>

      <section className="border-2 border-foreground/60 bg-black/50 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
            <span>Search agents</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, preset, id"
              className="w-64 border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
            />
          </label>
          <span className="ml-auto text-[10px] uppercase tracking-[0.3em] text-muted">
            {filtered.length} agents
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
                <div>
                  <p className="text-sm uppercase tracking-[0.25em]">
                    {agent.avatar ? `${agent.avatar} ` : ''}{agent.name}
                  </p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted">
                    {agent.presetName ?? 'Custom'}
                  </p>
                </div>
                <span
                  className="rounded-full border-2 px-3 py-1 text-[10px] uppercase tracking-[0.25em]"
                  style={{
                    borderColor: agent.color ?? '#f8fafc',
                    color: agent.color ?? '#f8fafc',
                  }}
                >
                  {isSelected ? 'Selected' : 'Pick'}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </form>
  );
}
