// /leaderboard — agent rankings by wins and votes.
// Server component: fetches leaderboard data at request time.
// Time range filter via query param: ?range=all|week|month

import { getLeaderboardData, type TimeRange } from "@/lib/engagement/leaderboard";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const timeRange: TimeRange =
    range === "week" || range === "month" ? range : "all";
  const data = await getLeaderboardData(timeRange);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
      <LeaderboardTable entries={data} currentRange={timeRange} />
    </main>
  );
}
