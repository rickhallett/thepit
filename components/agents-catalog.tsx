'use client';

import { useMemo, useState } from 'react';

import { cn } from '@/lib/cn';

export type AgentCatalogEntry = {
  id: string;
  name: string;
  presetId: string;
  presetName: string;
  tier: 'free' | 'premium';
  color?: string;
  avatar?: string;
};

export function AgentsCatalog({
  agents,
  presets,
  className,
}: {
  agents: AgentCatalogEntry[];
  presets: { id: string; name: string }[];
  className?: string;
}) {
  const [search, setSearch] = useState('');
  const [presetFilter, setPresetFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return agents.filter((agent) => {
      if (presetFilter !== 'all' && agent.presetId !== presetFilter) {
        return false;
      }
      if (tierFilter !== 'all' && agent.tier !== tierFilter) {
        return false;
      }
      if (!query) return true;
      return (
        agent.name.toLowerCase().includes(query) ||
        agent.id.toLowerCase().includes(query) ||
        agent.presetName.toLowerCase().includes(query)
      );
    });
  }, [agents, search, presetFilter, tierFilter]);

  return (
    <section className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Agent, preset, id"
            className="w-64 border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>Preset</span>
          <select
            value={presetFilter}
            onChange={(event) => setPresetFilter(event.target.value)}
            className="w-52 border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
          >
            <option value="all">All presets</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>Tier</span>
          <select
            value={tierFilter}
            onChange={(event) => setTierFilter(event.target.value)}
            className="w-40 border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
          >
            <option value="all">All</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>
        </label>
        <span className="ml-auto text-[10px] uppercase tracking-[0.3em] text-muted">
          {filtered.length} agents
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-foreground/40 p-8 text-center text-sm text-muted">
          No agents match those filters.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((agent) => (
            <article
              key={`${agent.presetId}-${agent.id}`}
              className="flex items-center justify-between border-2 border-foreground/60 bg-black/60 p-4"
            >
              <div>
                <p className="text-sm uppercase tracking-[0.25em]">
                  {agent.avatar ? `${agent.avatar} ` : ''}{agent.name}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted">
                  {agent.presetName} · {agent.tier}
                </p>
              </div>
              <span
                className="rounded-full border-2 px-3 py-1 text-[10px] uppercase tracking-[0.25em]"
                style={{ borderColor: agent.color ?? '#f8fafc', color: agent.color ?? '#f8fafc' }}
              >
                {agent.id}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
