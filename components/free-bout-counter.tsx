'use client';

/**
 * Displays the daily free bout pool status.
 * Shows remaining bouts out of the daily max, with a visual bar.
 */
export function FreeBoutCounter({
  used,
  max,
  remaining,
}: {
  used: number;
  max: number;
  remaining: number;
}) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 100;
  const exhausted = remaining <= 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-muted">
        <span>
          Free bouts today:{' '}
          <span className={exhausted ? 'text-red-400' : 'text-foreground'}>
            {remaining}
          </span>
          {' / '}
          {max}
        </span>
        {exhausted && (
          <span className="text-[10px] text-red-400">Pool exhausted</span>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`Free bouts used: ${used} of ${max}`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10"
      >
        <div
          className={`h-full transition-all duration-500 ${
            exhausted ? 'bg-red-400' : pct > 80 ? 'bg-yellow-400' : 'bg-accent'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
