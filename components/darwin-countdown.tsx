'use client';

import { useEffect, useState } from 'react';

const TARGET = new Date('2026-02-13T11:55:00Z').getTime();

type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const calculate = (): Countdown => {
  const diff = Math.max(0, TARGET - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
};

export function DarwinCountdown() {
  const [time, setTime] = useState<Countdown>(calculate());

  useEffect(() => {
    const id = window.setInterval(() => setTime(calculate()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="border-2 border-foreground/60 bg-black/50 p-6">
      <p className="text-xs uppercase tracking-[0.4em] text-accent">
        Darwin Day
      </p>
      <h2 className="mt-4 font-sans text-2xl uppercase tracking-tight">
        Countdown to launch
      </h2>
      <div className="mt-6 grid grid-cols-4 gap-4 text-center">
        <CountdownCell label="Days" value={time.days} />
        <CountdownCell label="Hours" value={time.hours} />
        <CountdownCell label="Minutes" value={time.minutes} />
        <CountdownCell label="Seconds" value={time.seconds} />
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
