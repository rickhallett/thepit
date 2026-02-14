import { LeaderboardDashboard } from '@/components/leaderboard-dashboard';
import { getLeaderboardData } from '@/lib/leaderboard';

export const revalidate = 30;

export default async function LeaderboardPage() {
  const data = await getLeaderboardData();

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="border-b-2 border-foreground/70 pb-6">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            Leaderboard
          </p>
          <h1 className="mt-3 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            Rankings
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Track who is winning crowd votes and which creators are shaping the
            arena. Filter by time window and switch between PIT and PLAYER
            views.
          </p>
        </header>

        <LeaderboardDashboard data={data} />
      </div>
    </main>
  );
}
