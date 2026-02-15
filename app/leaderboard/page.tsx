import { LeaderboardDashboard } from '@/components/leaderboard-dashboard';
import { getCopy } from '@/lib/copy';
import { getLeaderboardData } from '@/lib/leaderboard';

export const revalidate = 30;

export default async function LeaderboardPage() {
  const [data, c] = await Promise.all([getLeaderboardData(), getCopy()]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="border-b-2 border-foreground/70 pb-6">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            {c.leaderboard.title}
          </p>
          <h1 className="mt-3 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            {c.leaderboard.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            {c.leaderboard.description}
          </p>
        </header>

        <LeaderboardDashboard data={data} />
      </div>
    </main>
  );
}
