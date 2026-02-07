import { AgentsCatalog, type AgentCatalogEntry } from '@/components/agents-catalog';
import { ALL_PRESETS } from '@/lib/presets';

export default function AgentsPage() {
  const agents: AgentCatalogEntry[] = ALL_PRESETS.flatMap((preset) =>
    preset.agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      presetId: preset.id,
      presetName: preset.name,
      tier: preset.tier,
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
            Agents
          </p>
          <h1 className="mt-3 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            All Agents
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Browse every agent available in the arena right now. Filter by preset
            or tier when you want a tighter shortlist.
          </p>
        </header>

        <AgentsCatalog agents={agents} presets={presets} />
      </div>
    </main>
  );
}
