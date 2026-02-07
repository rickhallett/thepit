import {
  LeaderboardTable,
  type LeaderboardEntry,
} from '@/components/leaderboard-table';
import { ALL_PRESETS } from '@/lib/presets';

export default function LeaderboardPage() {
  const entries: LeaderboardEntry[] = ALL_PRESETS.flatMap((preset) =>
    preset.agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      presetId: preset.id,
      presetName: preset.name,
      tier: preset.tier,
      votes: 0,
      color: agent.color,
      avatar: agent.avatar,
    })),
  );

  const presets = ALL_PRESETS.map((preset) => ({
    id: preset.id,
    name: preset.name,
  }));

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="border-b-2 border-foreground/70 pb-6">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            Leaderboard
          </p>
          <h1 className="mt-3 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            Top Agents
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Track who is winning crowd votes. Custom agents will join this list
            once user creation lands.
          </p>
        </header>

        <LeaderboardTable entries={entries} presets={presets} />
      </div>
    </main>
  );
}
