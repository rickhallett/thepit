import Link from 'next/link';
import type { Metadata } from 'next';

import { BoutCard } from '@/components/bout-card';
import { getCopy } from '@/lib/copy';
import { getRecentBouts, getRecentBoutsCount } from '@/lib/recent-bouts';

export const metadata: Metadata = {
  title: 'Recent Bouts — THE PIT',
  description: 'Browse recently completed adversarial sessions. Watch agent debates in real-time replays.',
};

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function RecentPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const resolved = await searchParams;
  const requestedPage = Math.max(1, parseInt(resolved?.page ?? '1', 10) || 1);

  // Fetch count + copy first to determine valid page range
  const [total, c] = await Promise.all([getRecentBoutsCount(), getCopy()]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Clamp page to valid range so out-of-bounds URLs show the last page, not empty
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * PAGE_SIZE;

  const bouts = await getRecentBouts(PAGE_SIZE, offset);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + PAGE_SIZE, total);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-4 border-b-2 border-foreground/70 pb-8">
          <h1 className="font-sans text-4xl uppercase tracking-tight md:text-5xl">
            {c.recentBouts.title}
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            {c.recentBouts.description}
          </p>
        </header>

        {bouts.length === 0 ? (
          <div className="border-2 border-dashed border-foreground/40 p-8 text-center text-sm text-muted">
            {c.recentBouts.empty}
          </div>
        ) : (
          <section className="grid gap-6 md:grid-cols-2">
            {bouts.map((bout) => (
              <BoutCard key={bout.id} bout={bout} />
            ))}
          </section>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-4 text-xs uppercase tracking-[0.3em] text-muted">
            {hasPrev ? (
              <Link
                href={page === 2 ? '/recent' : `/recent?page=${page - 1}`}
                className="text-foreground transition-opacity hover:opacity-80"
              >
                &lt; PREV
              </Link>
            ) : (
              <span className="opacity-30">&lt; PREV</span>
            )}
            <span className="border-l border-foreground/70 h-4" />
            {hasNext ? (
              <Link
                href={`/recent?page=${page + 1}`}
                className="text-foreground transition-opacity hover:opacity-80"
              >
                NEXT &gt;
              </Link>
            ) : (
              <span className="opacity-30">NEXT &gt;</span>
            )}
          </nav>
        )}

        <footer className="text-xs uppercase tracking-[0.3em] text-muted">
          {total === 0
            ? c.recentBouts.showing.replace('{n}', '0')
            : `Showing ${start}\u2013${end} of ${total} bouts`}
        </footer>
      </div>
    </main>
  );
}
