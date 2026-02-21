'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import { AgentDetailsModal } from '@/components/agent-details-modal';
import { AgentIcon } from '@/components/agent-icon';
import { DnaFingerprint } from '@/components/dna-fingerprint';
import { cn } from '@/lib/cn';
import { useCopy } from '@/lib/copy-client';
import { DEFAULT_AGENT_COLOR } from '@/lib/presets';
import { buildLineage } from '@/lib/agent-lineage';
import { getAgentDisplayName } from '@/lib/agent-display-name';
import type { PitLeaderboardEntry } from '@/lib/leaderboard';

type SortKey = 'votes' | 'wins' | 'winRate' | 'bouts';

export function LeaderboardTable({
  entries,
  className,
}: {
  entries: PitLeaderboardEntry[];
  className?: string;
}) {
  const c = useCopy();
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

  const getLineage = (agent: PitLeaderboardEntry) =>
    buildLineage(agent.parentId, nameLookup, parentLookup);

  return (
    <section className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>{c.leaderboard.search}</span>
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
            className="w-full border-2 border-foreground/70 bg-black/60 px-3 py-2 pr-8 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none sm:w-52"
          >
            <option value="all">{c.leaderboard.presetFilter}</option>
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
            className="w-full border-2 border-foreground/70 bg-black/60 px-3 py-2 pr-8 text-xs uppercase tracking-[0.2em] text-foreground focus:border-accent focus:outline-none sm:w-40"
          >
            <option value="preset">{c.leaderboard.sourceFilter.preset}</option>
            <option value="custom">{c.leaderboard.sourceFilter.custom}</option>
            <option value="all">{c.leaderboard.sourceFilter.all}</option>
          </select>
        </label>
        <span className="ml-auto text-[10px] uppercase tracking-[0.3em] text-muted">
          {c.leaderboard.ranked.replace('{n}', String(filtered.length))}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-foreground/40 p-8 text-center text-sm text-muted">
          {c.leaderboard.empty}
        </div>
      ) : (
        <div className="relative">
          <div className="overflow-x-auto border-2 border-foreground/60">
          <table className="min-w-[820px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-foreground/60 bg-black/60 text-[10px] uppercase tracking-[0.3em] text-muted">
                <th scope="col" className="px-4 py-3 font-normal">{c.leaderboard.columns.agent}</th>
                <th scope="col" className="px-4 py-3 font-normal">{c.leaderboard.columns.preset}</th>
                <th
                  scope="col"
                  className="w-[80px] px-4 py-3 font-normal text-right"
                  aria-sort={sortKey === 'bouts' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort('bouts')}
                    className="transition hover:text-foreground"
                  >
                    {c.leaderboard.columns.bouts}
                  </button>
                </th>
                <th
                  scope="col"
                  className="w-[70px] px-4 py-3 font-normal text-right"
                  aria-sort={sortKey === 'wins' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort('wins')}
                    className="transition hover:text-foreground"
                  >
                    {c.leaderboard.columns.wins}
                  </button>
                </th>
                <th
                  scope="col"
                  className="w-[80px] px-4 py-3 font-normal text-right"
                  aria-sort={sortKey === 'winRate' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort('winRate')}
                    className="transition hover:text-foreground"
                  >
                    {c.leaderboard.columns.winRate}
                  </button>
                </th>
                <th
                  scope="col"
                  className="w-[70px] px-4 py-3 font-normal text-right"
                  aria-sort={sortKey === 'votes' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort('votes')}
                    className="transition hover:text-foreground"
                  >
                    {c.leaderboard.columns.votes}
                  </button>
                </th>
                <th scope="col" className="w-[90px] px-4 py-3 font-normal text-right">{c.leaderboard.columns.bestBout}</th>
              </tr>
            </thead>
            <tbody>
            {filtered.map((entry, index) => (
              <tr
                key={`${entry.presetId}-${entry.id}`}
                className="border-b border-foreground/40 text-sm transition hover:bg-black/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-[0.25em] text-muted">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveAgent(entry)}
                      title={entry.name}
                      className="flex items-center gap-3 uppercase tracking-[0.2em] transition hover:text-accent"
                    >
                      <DnaFingerprint hash={entry.manifestHash ?? entry.promptHash ?? ''} size={20} className="shrink-0" />
                      <span
                        className="flex items-center justify-center rounded-full border-2 px-2 py-0.5"
                        style={{
                          borderColor: entry.color ?? DEFAULT_AGENT_COLOR,
                          color: entry.color ?? DEFAULT_AGENT_COLOR,
                        }}
                      >
                        <AgentIcon avatar={entry.avatar} size={12} />
                      </span>
                      <span>{getAgentDisplayName(entry.name)}</span>
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs uppercase tracking-[0.25em] text-muted">
                  {entry.presetName ?? 'Custom'}
                </td>
                <td className="px-4 py-3 text-right text-xs uppercase tracking-[0.25em] text-muted">
                  {entry.bouts}
                </td>
                <td className="px-4 py-3 text-right text-xs uppercase tracking-[0.25em] text-muted">
                  {entry.wins}
                </td>
                <td className="px-4 py-3 text-right text-xs uppercase tracking-[0.25em] text-muted">
                  {Math.round(entry.winRate * 100)}%
                </td>
                <td className="px-4 py-3 text-right text-xs uppercase tracking-[0.25em] text-muted">
                  {entry.votes}
                </td>
                <td className="px-4 py-3 text-right text-xs uppercase tracking-[0.25em] text-muted">
                  {entry.bestBoutId ? (
                    <Link
                      href={`/b/${entry.bestBoutId}`}
                      className="text-accent underline"
                    >
                      {c.leaderboard.replay}
                    </Link>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
            </tbody>
          </table>
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
                lineage: getLineage(activeAgent),
              }
            : null
        }
        onClose={() => setActiveAgent(null)}
      />
    </section>
  );
}
