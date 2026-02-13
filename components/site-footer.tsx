import Link from 'next/link';

import { enabledSocialChannels } from '@/lib/brand';

export function SiteFooter() {
  const socials = enabledSocialChannels();

  return (
    <footer className="border-t-2 border-foreground/70 px-6 py-6 text-[10px] uppercase tracking-[0.35em] text-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        {/* Social links — only rendered when at least one channel is enabled */}
        {socials.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {socials.map((ch) => (
              <a
                key={ch.key}
                href={ch.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-foreground/40 px-3 py-1 transition hover:border-accent hover:text-accent"
              >
                {ch.label}
              </a>
            ))}
          </div>
        )}

        {/* Navigation links */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>&copy; THE PIT</span>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/research"
              className="rounded-full border border-foreground/40 px-3 py-1 transition hover:border-accent hover:text-accent"
            >
              Research
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-foreground/40 px-3 py-1 transition hover:border-accent hover:text-accent"
            >
              Contact
            </Link>
            <Link
              href="/feedback"
              className="rounded-full border border-foreground/40 px-3 py-1 transition hover:border-accent hover:text-accent"
            >
              Feedback
            </Link>
            <Link
              href="/security"
              className="rounded-full border border-foreground/40 px-3 py-1 transition hover:border-accent hover:text-accent"
            >
              Security
            </Link>
            <Link
              href="/disclaimer"
              className="rounded-full border border-foreground/40 px-3 py-1 transition hover:border-accent hover:text-accent"
            >
              Disclaimer
            </Link>
            <Link
              href="/privacy"
              className="rounded-full border border-foreground/40 px-3 py-1 transition hover:border-accent hover:text-accent"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="rounded-full border border-foreground/40 px-3 py-1 transition hover:border-accent hover:text-accent"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
