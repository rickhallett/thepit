import Link from 'next/link';

import type { RecentBout } from '@/lib/recent-bouts';
import { getCopy } from '@/lib/copy';

function timeAgo(date: Date, copy: { justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string }): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return copy.justNow;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return copy.minutesAgo.replace('{n}', String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return copy.hoursAgo.replace('{n}', String(hours));
  const days = Math.floor(hours / 24);
  return copy.daysAgo.replace('{n}', String(days));
}

export async function BoutCard({ bout }: { bout: RecentBout }) {
  const c = await getCopy();
  const agentList =
    bout.agentNames.length > 4
      ? `${bout.agentNames.slice(0, 3).join(', ')} +${bout.agentNames.length - 3}`
      : bout.agentNames.join(' vs ');

  return (
    <Link
      href={`/b/${bout.id}`}
      className="group flex flex-col gap-3 border-2 border-foreground/60 bg-black/60 p-5 shadow-[6px_6px_0_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:border-accent"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">
          {bout.presetName}
        </p>
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted">
          {timeAgo(bout.createdAt, c.boutCard.timeAgo)}
        </span>
      </div>

      <p className="text-[10px] uppercase tracking-[0.2em] text-muted">
        {agentList}
      </p>

      {bout.topic && (
        <p className="text-xs text-foreground/80">
          {c.boutCard.topic} {bout.topic}
        </p>
      )}

      <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.25em] text-muted">
        {bout.reactionCount > 0 && (
          <span>🔥 {bout.reactionCount}</span>
        )}
        <span>{c.boutCard.turns.replace('{n}', String(bout.turnCount))}</span>
      </div>

      {bout.shareLine && (
        <p className="text-xs italic text-foreground/60">
          &ldquo;{bout.shareLine.length > 100
            ? `${bout.shareLine.slice(0, 97)}...`
            : bout.shareLine}&rdquo;
        </p>
      )}

      <span className="mt-auto text-[10px] uppercase tracking-[0.3em] text-accent opacity-0 transition group-hover:opacity-100">
        {c.boutCard.watchReplay}
      </span>
    </Link>
  );
}
