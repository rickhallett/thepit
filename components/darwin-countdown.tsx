'use client';

import { useSyncExternalStore } from 'react';
import { useCopy } from '@/lib/copy';

const LAUNCH_DATE = new Date('2026-02-13T11:55:00Z');

type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const ZERO: Countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };

function calculate(): Countdown {
  const diff = Math.max(0, LAUNCH_DATE.getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function getIsLive(): boolean {
  return Date.now() >= LAUNCH_DATE.getTime();
}

function subscribeToTime(callback: () => void): () => void {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
}

/**
 * Post-launch banner replacing the countdown timer.
 *
 * Shows "WE'RE LIVE" when the launch date has passed,
 * otherwise shows a countdown to launch.
 */
export function DarwinCountdown() {
  const c = useCopy();
  const isLive = useSyncExternalStore(subscribeToTime, getIsLive, () => false);

  if (isLive) {
    return (
      <div className="border-2 border-accent bg-black/50 p-6">
        <div className="flex items-center gap-3">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-accent" />
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            {c.darwinCountdown.label}
          </p>
        </div>
        <h2 className="mt-4 font-sans text-2xl uppercase tracking-tight md:text-3xl">
          {c.darwinCountdown.liveTitle}
        </h2>
        <p className="mt-3 text-sm text-muted">
          {c.darwinCountdown.liveDescription}
        </p>
      </div>
    );
  }

  return <CountdownDisplay />;
}

/** Renders the countdown timer with a 1-second tick. */
function CountdownDisplay() {
  const c = useCopy();
  const time = useSyncExternalStore(subscribeToTime, calculate, () => ZERO);

  return (
    <div className="border-2 border-foreground/60 bg-black/50 p-6">
      <p className="text-xs uppercase tracking-[0.4em] text-accent">
        {c.darwinCountdown.label}
      </p>
      <h2 className="mt-4 font-sans text-2xl uppercase tracking-tight">
        {c.darwinCountdown.countdownTitle}
      </h2>
      <div className="mt-6 grid grid-cols-4 gap-4 text-center">
        <CountdownCell label={c.darwinCountdown.days} value={time.days} />
        <CountdownCell label={c.darwinCountdown.hours} value={time.hours} />
        <CountdownCell label={c.darwinCountdown.minutes} value={time.minutes} />
        <CountdownCell label={c.darwinCountdown.seconds} value={time.seconds} />
      </div>
    </div>
  );
}

function CountdownCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-2 border-foreground/40 bg-black/60 p-4">
      <p className="text-2xl font-sans tracking-tight text-foreground">
        {value.toString().padStart(2, '0')}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-muted">
        {label}
      </p>
    </div>
  );
}
