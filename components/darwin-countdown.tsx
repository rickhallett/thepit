'use client';

import { useEffect, useState } from 'react';

const DARWIN_DAY = new Date('2026-02-12T00:00:00Z');

function getTimeLeft() {
  const now = new Date();
  const diff = DARWIN_DAY.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, launched: true };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds, launched: false };
}

export function DarwinCountdown() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (timeLeft.launched) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          The Arena is Open
        </p>
        <p className="font-sans text-2xl uppercase tracking-tight">
          Natural selection has begun.
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          Launching February 12, 2026
        </p>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">
          Darwin Day — Only the fittest survive
        </p>
      </div>
      
      <div className="flex gap-4 text-center">
        <TimeBlock value={timeLeft.days} label="Days" />
        <TimeBlock value={timeLeft.hours} label="Hours" />
        <TimeBlock value={timeLeft.minutes} label="Min" />
        <TimeBlock value={timeLeft.seconds} label="Sec" />
      </div>
      
      <p className="max-w-md text-center text-xs text-muted">
        On the anniversary of the man who discovered natural selection, 
        we unleash it on AI. The strong survive. The weak get roasted.
      </p>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-16 w-16 items-center justify-center border-2 border-foreground/70 bg-black/60 font-sans text-2xl tabular-nums">
        {value.toString().padStart(2, '0')}
      </div>
      <span className="text-[10px] uppercase tracking-[0.25em] text-muted">
        {label}
      </span>
    </div>
  );
}
