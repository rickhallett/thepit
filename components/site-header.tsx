'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AuthControls } from '@/components/auth-controls';
import { cn } from '@/lib/cn';

const PRIMARY_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/arena', label: 'Arena' },
  { href: '/agents', label: 'All agents' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

const OVERFLOW_LINKS = [
  { href: '/research', label: 'Research' },
  { href: '/developers', label: 'Developers' },
  { href: '/roadmap', label: 'Roadmap' },
  { href: '/contact', label: 'Contact' },
  { href: '/feedback', label: 'Feedback' },
];

const ALL_LINKS = [...PRIMARY_LINKS, ...OVERFLOW_LINKS];

export function SiteHeader({ className }: { className?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const moreRef = useRef<HTMLDivElement>(null);

  // Close "More" dropdown on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  // Close dropdowns on route change
  useEffect(() => {
    setMoreOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const isOverflowActive = OVERFLOW_LINKS.some((l) => pathname === l.href);

  return (
    <header
      className={cn(
        'border-b-2 border-foreground/70 bg-black/70 px-6 py-4 text-xs uppercase tracking-[0.25em] text-muted',
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-accent">
            THE PIT
          </Link>
          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 lg:flex">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-full border-2 border-foreground/40 px-2.5 py-1 text-[10px] tracking-[0.15em] transition hover:border-accent hover:text-accent',
                  pathname === link.href && 'border-accent text-accent',
                )}
              >
                {link.label}
              </Link>
            ))}
            {/* More dropdown */}
            <div ref={moreRef} className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((prev) => !prev)}
                className={cn(
                  'rounded-full border-2 border-foreground/40 px-2.5 py-1 text-[10px] tracking-[0.15em] transition hover:border-accent hover:text-accent',
                  (moreOpen || isOverflowActive) && 'border-accent text-accent',
                )}
                aria-expanded={moreOpen}
                aria-haspopup="true"
              >
                More
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className={cn('ml-1 inline-block h-2.5 w-2.5 transition', moreOpen && 'rotate-180')}
                >
                  <path d="M2 4l4 4 4-4" />
                </svg>
              </button>
              {moreOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 flex min-w-[160px] flex-col gap-1 border-2 border-foreground/60 bg-black/95 p-2 shadow-[4px_4px_0_rgba(255,255,255,0.1)]">
                  {OVERFLOW_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        'rounded px-3 py-2 text-[10px] tracking-[0.15em] transition hover:bg-foreground/5 hover:text-accent',
                        pathname === link.href && 'text-accent',
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {/* Desktop auth controls - hidden on mobile, shown in drawer instead */}
          <AuthControls className="hidden lg:flex" />
          {/* Hamburger toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-8 w-8 items-center justify-center rounded border-2 border-foreground/40 transition hover:border-accent hover:text-accent lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              {menuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
      {/* Mobile nav drawer */}
      {menuOpen && (
        <nav className="mx-auto mt-4 flex max-w-6xl flex-col gap-1 border-t border-foreground/20 pt-4 lg:hidden">
          {ALL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'rounded px-3 py-2 text-[10px] tracking-[0.25em] transition hover:bg-foreground/5 hover:text-accent',
                pathname === link.href && 'text-accent',
              )}
            >
              {link.label}
            </Link>
          ))}
          {/* Mobile auth controls */}
          <div className="mt-3 border-t border-foreground/20 pt-3">
            <AuthControls className="justify-start" />
          </div>
        </nav>
      )}
    </header>
  );
}
