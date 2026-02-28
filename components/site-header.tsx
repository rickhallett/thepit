'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AuthControls } from '@/components/auth-controls';
import { cn } from '@/lib/cn';
import { useCopy } from '@/lib/copy-client';

export function SiteHeader({ className }: { className?: string }) {
  const c = useCopy();
  // Track which pathname the dropdowns were opened on.
  // When pathname changes, the dropdowns auto-close because the derived
  // booleans below resolve to false. No effect + setState needed.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const pathname = usePathname();

  const menuOpen = menuOpenOn === pathname;
  const setMenuOpen = (open: boolean) =>
    setMenuOpenOn(open ? pathname : null);

  const allLinks = [...c.nav.primary, ...c.nav.overflow];

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
            {c.nav.brand}
          </Link>
          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 lg:flex">
            {c.nav.primary.map((link) => (
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
            {/* Overflow items (Contact, Feedback) live in footer + mobile drawer only */}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {/* Desktop auth controls - hidden on mobile, shown in drawer instead */}
          <AuthControls className="hidden lg:flex" />
          {/* Hamburger toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
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
          {allLinks.map((link) => (
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
