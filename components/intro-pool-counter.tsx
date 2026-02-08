'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';

export function IntroPoolCounter({
  remainingCredits,
  drainRatePerMinute,
  startedAt,
  className,
}: {
  remainingCredits: number;
  drainRatePerMinute: number;
  startedAt: string;
  className?: string;
}) {
  const [value, setValue] = useState(remainingCredits);

  useEffect(() => {
    const started = new Date(startedAt).getTime();
    const tick = () => {
      const elapsedMs = Date.now() - started;
      const drained = (elapsedMs / 60000) * drainRatePerMinute;
      const next = Math.max(0, Math.floor(remainingCredits - drained));
      setValue(next);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [drainRatePerMinute, remainingCredits, startedAt]);

  return (
    <span className={cn('font-mono text-foreground', className)}>
      {value.toLocaleString()}
    </span>
  );
}
