'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import { AgentDetailsModal } from '@/components/agent-details-modal';
import { AgentIcon } from '@/components/agent-icon';
import { cn } from '@/lib/cn';
import { DEFAULT_AGENT_COLOR } from '@/lib/presets';
import type { PitLeaderboardEntry } from '@/lib/leaderboard';

type SortKey = 'votes' | 'wins' | 'winRate' | 'bouts';

export function LeaderboardTable({
  entries,
  className,
}: {
  entries: PitLeaderboardEntry[];
  className?: string;
}) {
  const [search, setSearch] = useState('');
  const [presetFilter, setPresetFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'preset' | 'custom'>(
    'all',
  );
  const [activeAgent, setActiveAgent] = useState<PitLeaderboardEntry | null>(
    null,
  );
  const [sortKey, setSortKey] = useState<SortKey>('votes');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const nameLookup = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((agent) => map.set(agent.id, agent.name));
    return map;
  }, [entries]);

  const presetOptions = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((entry) => {
      if (entry.presetId && entry.presetName) {
        map.set(entry.presetId, entry.presetName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [entries]);

  const parentLookup = useMemo(() => {
    const map = new Map<string, string | null>();
    entries.forEach((agent) => map.set(agent.id, agent.parentId ?? null));
    return map;
  }, [entries]);

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
      .sort((a, b) => {
        if (a[sortKey] === b[sortKey]) {
          return a.name.localeCompare(b.name);
        }
        return sortDir === 'desc'
          ? b[sortKey] - a[sortKey]
          : a[sortKey] - b[sortKey];
      });
  }, [entries, presetFilter, search, sourceFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
      return;
    }
    setSortKey(key);
    setSortDir('desc');
  };

  const buildLineage = (agent: PitLeaderboardEntry) => {
    const lineage: { id: string; name: string }[] = [];
    const seen = new Set<string>();
    let currentParent = agent.parentId ?? null;
    let depth = 0;
    const maxDepth = 3;

    while (currentParent && depth < maxDepth && !seen.has(currentParent)) {
      seen.add(currentParent);
      lineage.push({
        id: currentParent,
        name: nameLookup.get(currentParent) ?? currentParent,
      });
      currentParent = parentLookup.get(currentParent) ?? null;
      depth += 1;
    }

    return lineage;
  };

  return (
    <section className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Agent name"
            className="w-full border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground placeholder:text-muted focus:border-accent focus:outline-none sm:w-64"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>Preset</span>
          <select
            value={presetFilter}
            onChange={(event) => setPresetFilter(event.target.value)}
            className="w-full border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none sm:w-52"
          >
            <option value="all">All presets</option>
            {presetOptions.map((preset) => (
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
            className="w-full border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none sm:w-40"
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
        <div className="relative">
          <div className="overflow-x-auto border-2 border-foreground/60">
          <div className="grid min-w-[820px] grid-cols-[minmax(0,2fr)_minmax(0,1fr)_80px_70px_80px_70px_90px] gap-4 border-b-2 border-foreground/60 bg-black/60 px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-muted">
            <span>Agent</span>
            <span>Preset</span>
            <button
              type="button"
              onClick={() => toggleSort('bouts')}
              className="text-right transition hover:text-foreground"
            >
              Bouts
            </button>
            <button
              type="button"
              onClick={() => toggleSort('wins')}
              className="text-right transition hover:text-foreground"
            >
              Wins
            </button>
            <button
              type="button"
              onClick={() => toggleSort('winRate')}
              className="text-right transition hover:text-foreground"
            >
              Win %
            </button>
            <button
              type="button"
              onClick={() => toggleSort('votes')}
              className="text-right transition hover:text-foreground"
            >
              Votes
            </button>
            <span className="text-right">Best bout</span>
          </div>
          {filtered.map((entry, index) => (
            <div
              key={`${entry.presetId}-${entry.id}`}
              className="grid min-w-[820px] grid-cols-[minmax(0,2fr)_minmax(0,1fr)_80px_70px_80px_70px_90px] gap-4 border-b border-foreground/40 px-4 py-3 text-left text-sm transition hover:bg-black/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-[0.25em] text-muted">
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveAgent(entry)}
                  className="flex items-center gap-3 uppercase tracking-[0.2em] transition hover:text-accent"
                >
                  <span
                    className="flex items-center justify-center rounded-full border-2 px-2 py-0.5"
                    style={{
                      borderColor: entry.color ?? DEFAULT_AGENT_COLOR,
                      color: entry.color ?? DEFAULT_AGENT_COLOR,
                    }}
                  >
                    <AgentIcon avatar={entry.avatar} size={12} />
                  </span>
                  <span>{entry.name}</span>
                </button>
              </div>
              <span className="text-xs uppercase tracking-[0.25em] text-muted">
                {entry.presetName ?? 'Custom'}
              </span>
              <span className="text-right text-xs uppercase tracking-[0.25em] text-muted">
                {entry.bouts}
              </span>
              <span className="text-right text-xs uppercase tracking-[0.25em] text-muted">
                {entry.wins}
              </span>
              <span className="text-right text-xs uppercase tracking-[0.25em] text-muted">
                {Math.round(entry.winRate * 100)}%
              </span>
              <span className="text-right text-xs uppercase tracking-[0.25em] text-muted">
                {entry.votes}
              </span>
              <span className="text-right text-xs uppercase tracking-[0.25em] text-muted">
                {entry.bestBoutId ? (
                  <Link
                    href={`/b/${entry.bestBoutId}`}
                    className="text-accent underline"
                  >
                    Replay
                  </Link>
                ) : (
                  '-'
                )}
              </span>
            </div>
          ))}
          </div>
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-l from-background to-transparent md:hidden" />
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
                lineage: buildLineage(activeAgent),
              }
            : null
        }
        onClose={() => setActiveAgent(null)}
      />
    </section>
  );
}
