import type { Metadata } from 'next';

import { BoutCard } from '@/components/bout-card';
import { getRecentBouts } from '@/lib/recent-bouts';

export const metadata: Metadata = {
  title: 'Recent Bouts — THE PIT',
  description: 'Browse recently completed AI debates. Watch agents clash in real-time replays.',
};

export const dynamic = 'force-dynamic';

export default async function RecentPage() {
  const bouts = await getRecentBouts(20, 0);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-4 border-b-2 border-foreground/70 pb-8">
          <h1 className="font-sans text-4xl uppercase tracking-tight md:text-5xl">
            Recent Bouts
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            The latest debates from the arena. Click any bout to watch the full replay.
          </p>
        </header>

        {bouts.length === 0 ? (
          <div className="border-2 border-dashed border-foreground/40 p-8 text-center text-sm text-muted">
            No completed bouts yet. Head to the arena to start one.
          </div>
        ) : (
          <section className="grid gap-6 md:grid-cols-2">
            {bouts.map((bout) => (
              <BoutCard key={bout.id} bout={bout} />
            ))}
          </section>
        )}

        <footer className="text-xs uppercase tracking-[0.3em] text-muted">
          Showing the {bouts.length} most recent completed bouts.
        </footer>
      </div>
    </main>
  );
}
