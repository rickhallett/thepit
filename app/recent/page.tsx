import type { Metadata } from 'next';

import { BoutCard } from '@/components/bout-card';
import { getCopy } from '@/lib/copy';
import { getRecentBouts } from '@/lib/recent-bouts';

export const metadata: Metadata = {
  title: 'Recent Bouts — THE PIT',
  description: 'Browse recently completed AI debates. Watch agents clash in real-time replays.',
};

export const dynamic = 'force-dynamic';

export default async function RecentPage() {
  const [bouts, c] = await Promise.all([getRecentBouts(20, 0), getCopy()]);

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

        <footer className="text-xs uppercase tracking-[0.3em] text-muted">
          {c.recentBouts.showing.replace('{n}', String(bouts.length))}
        </footer>
      </div>
    </main>
  );
}
