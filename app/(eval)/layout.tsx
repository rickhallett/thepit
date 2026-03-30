// Eval route group layout with sidebar navigation.

import Link from 'next/link';

export default function EvalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-48 shrink-0 border-r border-foreground/10 p-4">
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted">
          Eval
        </p>
        <ul className="space-y-2">
          <li>
            <Link
              href="/runs"
              className="block text-sm text-foreground/70 transition hover:text-accent"
            >
              Runs
            </Link>
          </li>
          <li>
            <Link
              href="/runs/new"
              className="block text-sm text-foreground/70 transition hover:text-accent"
            >
              New Run
            </Link>
          </li>
        </ul>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
