'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';

export function IntroPoolCounter({
  initialCredits,
  halfLifeDays,
  startedAt,
  className,
}: {
  initialCredits: number;
  halfLifeDays: number;
  startedAt: string;
  className?: string;
}) {
  const [value, setValue] = useState(initialCredits);

  useEffect(() => {
    const started = new Date(startedAt).getTime();
    const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;
    const tick = () => {
      const elapsed = Date.now() - started;
      const decayed = initialCredits * Math.pow(0.5, elapsed / halfLifeMs);
      setValue(Math.max(0, Math.floor(decayed)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [halfLifeDays, initialCredits, startedAt]);

  return (
    <span className={cn('font-mono text-foreground', className)}>
      {value.toLocaleString()}
    </span>
  );
}
