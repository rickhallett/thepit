import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-foreground/70 px-6 py-6 text-[10px] uppercase tracking-[0.35em] text-muted">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <span>© THE PIT</span>
        <div className="flex flex-wrap gap-3">
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
    </footer>
  );
}
