'use client';

import { useMemo, useState } from 'react';

import { AgentDetailsModal } from '@/components/agent-details-modal';
import { cn } from '@/lib/cn';

export type LeaderboardEntry = {
  id: string;
  name: string;
  presetId: string | null;
  presetName: string | null;
  tier: 'free' | 'premium' | 'custom';
  votes: number;
  color?: string;
  avatar?: string;
  systemPrompt: string;
  responseLength?: string | null;
  responseFormat?: string | null;
  createdAt?: string | null;
  ownerId?: string | null;
  parentId?: string | null;
  promptHash?: string | null;
  manifestHash?: string | null;
  attestationUid?: string | null;
  attestationTxHash?: string | null;
};

export function LeaderboardTable({
  entries,
  presets,
  className,
}: {
  entries: LeaderboardEntry[];
  presets: { id: string; name: string }[];
  className?: string;
}) {
  const [search, setSearch] = useState('');
  const [presetFilter, setPresetFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'preset' | 'custom'>(
    'preset',
  );
  const [activeAgent, setActiveAgent] = useState<LeaderboardEntry | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries
      .filter((entry) => {
        if (sourceFilter === 'custom' && entry.tier !== 'custom') return false;
        if (sourceFilter === 'preset' && entry.tier === 'custom') return false;
        if (presetFilter !== 'all' && entry.presetId !== presetFilter) {
          return false;
        }
        if (!query) return true;
        return (
          entry.name.toLowerCase().includes(query) ||
          entry.presetName?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.votes - a.votes);
  }, [entries, presetFilter, search, sourceFilter]);

  return (
    <section className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Agent name"
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
          <span>Source</span>
          <select
            value={sourceFilter}
            onChange={(event) =>
              setSourceFilter(event.target.value as 'all' | 'preset' | 'custom')
            }
            className="w-40 border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none"
          >
            <option value="preset">Preset</option>
            <option value="custom">Custom</option>
            <option value="all">All</option>
          </select>
        </label>
        <span className="ml-auto text-[10px] uppercase tracking-[0.3em] text-muted">
          {filtered.length} ranked
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-foreground/40 p-8 text-center text-sm text-muted">
          No votes yet. Leaderboard will light up once audiences start voting.
        </div>
      ) : (
        <div className="overflow-hidden border-2 border-foreground/60">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_80px] gap-4 border-b-2 border-foreground/60 bg-black/60 px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-muted">
            <span>Agent</span>
            <span>Preset</span>
            <span className="text-right">Votes</span>
          </div>
          {filtered.map((entry, index) => (
            <button
              key={`${entry.presetId}-${entry.id}`}
              type="button"
              onClick={() => setActiveAgent(entry)}
              className="grid w-full grid-cols-[minmax(0,2fr)_minmax(0,1fr)_80px] gap-4 border-b border-foreground/40 px-4 py-3 text-left text-sm transition hover:bg-black/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-[0.25em] text-muted">
                  {index + 1}
                </span>
                <span
                  className="rounded-full border-2 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]"
                  style={{
                    borderColor: entry.color ?? '#f8fafc',
                    color: entry.color ?? '#f8fafc',
                  }}
                >
                  {entry.avatar ?? '■'}
                </span>
                <span className="uppercase tracking-[0.2em]">
                  {entry.name}
                </span>
              </div>
              <span className="text-xs uppercase tracking-[0.25em] text-muted">
                {entry.presetName ?? 'Custom'}
              </span>
              <span className="text-right text-xs uppercase tracking-[0.25em] text-muted">
                {entry.votes}
              </span>
            </button>
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
              }
            : null
        }
        onClose={() => setActiveAgent(null)}
      />
    </section>
  );
}
