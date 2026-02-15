'use client';

import { useState } from 'react';

import { LeaderboardTable } from '@/components/leaderboard-table';
import { PlayerLeaderboardTable } from '@/components/player-leaderboard-table';
import { cn } from '@/lib/cn';
import { useCopy } from '@/lib/copy';
import type { LeaderboardData, LeaderboardRange } from '@/lib/leaderboard';

const getRangeLabels = (c: ReturnType<typeof useCopy>): Record<LeaderboardRange, string> => ({
  all: c.leaderboard.ranges.allTime,
  week: c.leaderboard.ranges.thisWeek,
  day: c.leaderboard.ranges.today,
});

type ViewMode = 'pit' | 'player';

export function LeaderboardDashboard({
  data,
  className,
}: {
  data: LeaderboardData;
  className?: string;
}) {
  const c = useCopy();
  const [view, setView] = useState<ViewMode>('pit');
  const [range, setRange] = useState<LeaderboardRange>('all');
  const RANGE_LABELS = getRangeLabels(c);

  return (
    <section className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 border-2 border-foreground/60 bg-black/70 p-1 text-xs uppercase tracking-[0.3em]">
          {(['pit', 'player'] as ViewMode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={cn(
                'px-3 py-2 transition',
                view === option
                  ? 'bg-accent text-background'
                  : 'text-muted hover:text-foreground',
              )}
            >
              {option === 'pit' ? c.leaderboard.tabs.pit : c.leaderboard.tabs.player}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 border-2 border-foreground/60 bg-black/70 p-1 text-xs uppercase tracking-[0.3em]">
          {(Object.keys(RANGE_LABELS) as LeaderboardRange[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={cn(
                'px-3 py-2 transition',
                range === option
                  ? 'bg-accent text-background'
                  : 'text-muted hover:text-foreground',
              )}
            >
              {RANGE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      {view === 'pit' ? (
        <LeaderboardTable entries={data[range].pit} />
      ) : (
        <PlayerLeaderboardTable entries={data[range].players} />
      )}
    </section>
  );
}
