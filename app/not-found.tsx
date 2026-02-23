import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-xs uppercase tracking-[0.4em] text-muted">
        Page not found.
      </p>
      <Link
        href="/"
        className="border-2 border-foreground/60 px-4 py-2 text-xs uppercase tracking-[0.3em] transition hover:border-accent hover:text-accent"
      >
        Back to The Pit
      </Link>
    </div>
  );
}
