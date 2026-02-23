'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';

export function IntroPoolCounter({
  remainingCredits,
  halfLifeDays,
  className,
}: {
  /** Server-computed remaining (accounts for claims). Used as baseline for client-side decay. */
  remainingCredits: number;
  halfLifeDays: number;
  className?: string;
}) {
  const [value, setValue] = useState(remainingCredits);

  useEffect(() => {
    // Use the server-rendered remainingCredits as the baseline truth,
    // then apply exponential decay from that snapshot forward.
    // This accounts for claimedMicro (which the client doesn't track).
    const snapshotTime = Date.now();
    const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;
    const tick = () => {
      const elapsed = Date.now() - snapshotTime;
      const decayed = remainingCredits * Math.pow(0.5, elapsed / halfLifeMs);
      setValue(Math.max(0, Math.floor(decayed)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [halfLifeDays, remainingCredits]);

  return (
    <span className={cn('font-mono text-foreground', className)}>
      {value.toLocaleString()}
    </span>
  );
}
