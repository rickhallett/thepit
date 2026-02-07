'use client';

import Link from 'next/link';

import { AuthControls } from '@/components/auth-controls';
import { cn } from '@/lib/cn';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/agents', label: 'All agents' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        'border-b-2 border-foreground/70 bg-black/70 px-6 py-4 text-xs uppercase tracking-[0.35em] text-muted',
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-accent">
            THE PIT
          </Link>
          <nav className="flex flex-wrap gap-3">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border-2 border-foreground/40 px-3 py-1 text-[10px] tracking-[0.25em] transition hover:border-accent hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <AuthControls />
      </div>
    </header>
  );
}
