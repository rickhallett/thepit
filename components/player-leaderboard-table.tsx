'use client';

import { useMemo, useState } from 'react';

import { cn } from '@/lib/cn';
import type { PlayerLeaderboardEntry } from '@/lib/leaderboard';

type SortKey = 'boutsCreated' | 'agentsCreated' | 'votesCast' | 'referrals';

export function PlayerLeaderboardTable({
  entries,
  className,
}: {
  entries: PlayerLeaderboardEntry[];
  className?: string;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('boutsCreated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries
      .filter((entry) =>
        query ? entry.name.toLowerCase().includes(query) : true,
      )
      .sort((a, b) => {
        if (a[sortKey] === b[sortKey]) {
          return a.name.localeCompare(b.name);
        }
        return sortDir === 'desc'
          ? b[sortKey] - a[sortKey]
          : a[sortKey] - b[sortKey];
      });
  }, [entries, search, sortDir, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
      return;
    }
    setSortKey(key);
    setSortDir('desc');
  };

  return (
    <section className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Player name"
            className="w-64 border-2 border-foreground/70 bg-black/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>
        <span className="ml-auto text-[10px] uppercase tracking-[0.3em] text-muted">
          {filtered.length} ranked
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-foreground/40 p-8 text-center text-sm text-muted">
          No player activity yet.
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-foreground/60">
          <div className="grid min-w-[640px] grid-cols-[minmax(0,2fr)_90px_90px_90px_90px] gap-4 border-b-2 border-foreground/60 bg-black/60 px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-muted">
            <span>Player</span>
            <button
              type="button"
              onClick={() => toggleSort('boutsCreated')}
              className="text-right transition hover:text-foreground"
            >
              Bouts
            </button>
            <button
              type="button"
              onClick={() => toggleSort('agentsCreated')}
              className="text-right transition hover:text-foreground"
            >
              Agents
            </button>
            <button
              type="button"
              onClick={() => toggleSort('votesCast')}
              className="text-right transition hover:text-foreground"
            >
              Votes
            </button>
            <button
              type="button"
              onClick={() => toggleSort('referrals')}
              className="text-right transition hover:text-foreground"
            >
              Referrals
            </button>
          </div>
          {filtered.map((entry, index) => (
            <div
              key={entry.id}
              className="grid min-w-[640px] grid-cols-[minmax(0,2fr)_90px_90px_90px_90px] gap-4 border-b border-foreground/40 px-4 py-3 text-left text-sm transition hover:bg-black/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-[0.25em] text-muted">
                  {index + 1}
                </span>
                <span className="uppercase tracking-[0.2em]">{entry.name}</span>
              </div>
              <span className="text-right text-xs uppercase tracking-[0.25em] text-muted">
                {entry.boutsCreated}
              </span>
              <span className="text-right text-xs uppercase tracking-[0.25em] text-muted">
                {entry.agentsCreated}
              </span>
              <span className="text-right text-xs uppercase tracking-[0.25em] text-muted">
                {entry.votesCast}
              </span>
              <span className="text-right text-xs uppercase tracking-[0.25em] text-muted">
                {entry.referrals}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
