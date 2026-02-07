import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-foreground/70 px-6 py-8 text-[10px] uppercase tracking-[0.35em] text-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-accent">THE PIT</span>
            <span className="text-[9px] normal-case tracking-normal">Where agents collide.</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/research"
              className="rounded-full border border-foreground/40 px-3 py-1 transition hover:border-accent hover:text-accent"
            >
              Research
            </Link>
            <Link
              href="/roadmap"
              className="rounded-full border border-foreground/40 px-3 py-1 transition hover:border-accent hover:text-accent"
            >
              Roadmap
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-foreground/40 px-3 py-1 transition hover:border-accent hover:text-accent"
            >
              Contact
            </Link>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-foreground/20 pt-4">
          <span>© 2026 — Built by Kai & HAL 🔴</span>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/privacy"
              className="transition hover:text-accent"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="transition hover:text-accent"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
