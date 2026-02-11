'use client';

import { useMemo, useState } from 'react';

import { AgentDetailsModal } from '@/components/agent-details-modal';
import { AgentIcon } from '@/components/agent-icon';
import { cn } from '@/lib/cn';
import type { AgentSnapshot } from '@/lib/agent-registry';
import { DEFAULT_AGENT_COLOR } from '@/lib/presets';
import { buildLineage } from '@/lib/agent-lineage';

export type AgentCatalogEntry = Pick<
  AgentSnapshot,
  | 'id' | 'name' | 'presetId' | 'presetName' | 'tier'
  | 'color' | 'avatar' | 'systemPrompt' | 'responseLength'
  | 'responseFormat' | 'createdAt' | 'ownerId' | 'parentId'
  | 'promptHash' | 'manifestHash' | 'attestationUid' | 'attestationTxHash'
>;

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
  const [activeAgent, setActiveAgent] = useState<AgentCatalogEntry | null>(
    null,
  );

  const nameLookup = useMemo(() => {
    const map = new Map<string, string>();
    agents.forEach((agent) => map.set(agent.id, agent.name));
    return map;
  }, [agents]);

  const parentLookup = useMemo(() => {
    const map = new Map<string, string | null>();
    agents.forEach((agent) => map.set(agent.id, agent.parentId ?? null));
    return map;
  }, [agents]);

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
        agent.presetName?.toLowerCase().includes(query)
      );
    });
  }, [agents, search, presetFilter, tierFilter]);

  const getLineage = (agent: AgentCatalogEntry) =>
    buildLineage(agent.parentId, nameLookup, parentLookup);

  return (
    <section className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Agent, preset, id"
            className="w-full border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground placeholder:text-muted focus:border-accent focus:outline-none sm:w-64"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>Preset</span>
          <select
            value={presetFilter}
            onChange={(event) => setPresetFilter(event.target.value)}
            className="w-full border-2 border-foreground/70 bg-black/60 px-3 py-2 pr-8 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none sm:w-52"
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
            className="w-full border-2 border-foreground/70 bg-black/60 px-3 py-2 pr-8 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none sm:w-40"
          >
            <option value="all">All</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
            <option value="custom">Custom</option>
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
              className="flex items-center justify-between border-2 border-foreground/60 bg-black/60 p-4 transition hover:-translate-y-0.5"
              role="button"
              tabIndex={0}
              onClick={() => setActiveAgent(agent)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  setActiveAgent(agent);
                }
              }}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm uppercase tracking-[0.25em]">
                  <AgentIcon avatar={agent.avatar} size={14} className="shrink-0" />
                  {agent.name}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted">
                  {agent.presetName ?? 'Custom'} · {agent.tier}
                </p>
              </div>
              <span
                className="max-w-[120px] shrink-0 truncate rounded-full border-2 px-3 py-1 text-[10px] uppercase tracking-[0.25em]"
                style={{
                  borderColor: agent.color ?? DEFAULT_AGENT_COLOR,
                  color: agent.color ?? DEFAULT_AGENT_COLOR,
                }}
              >
                {agent.id}
              </span>
            </article>
          ))}
        </div>
      )}

      <AgentDetailsModal
        agent={
          activeAgent
            ? {
                id: activeAgent.id,
                name: activeAgent.name,
                presetName: activeAgent.presetName,
                tier: activeAgent.tier,
                systemPrompt: activeAgent.systemPrompt,
                createdAt: activeAgent.createdAt,
                ownerId: activeAgent.ownerId,
                parentId: activeAgent.parentId,
                promptHash: activeAgent.promptHash,
                manifestHash: activeAgent.manifestHash,
                attestationUid: activeAgent.attestationUid,
                attestationTxHash: activeAgent.attestationTxHash,
                responseLength: activeAgent.responseLength ?? null,
                responseFormat: activeAgent.responseFormat ?? null,
                lineage: getLineage(activeAgent),
              }
            : null
        }
        onClose={() => setActiveAgent(null)}
      />
    </section>
  );
}
