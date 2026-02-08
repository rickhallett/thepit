import Link from 'next/link';

import { AgentsCatalog } from '@/components/agents-catalog';
import { getAgentSnapshots } from '@/lib/agent-registry';
import { ALL_PRESETS } from '@/lib/presets';

export default async function AgentsPage() {
  const agents = await getAgentSnapshots();
  const presets = ALL_PRESETS.map((preset) => ({
    id: preset.id,
    name: preset.name,
  }));

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="border-b-2 border-foreground/70 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-accent">
                Agents
              </p>
              <h1 className="mt-3 font-sans text-3xl uppercase tracking-tight md:text-4xl">
                All Agents
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-muted">
                Browse every agent available in the arena right now. Filter by
                preset or tier when you want a tighter shortlist.
              </p>
            </div>
            <Link
              href="/agents/new"
              className="border-2 border-foreground/70 px-5 py-3 text-xs uppercase tracking-[0.4em] transition hover:border-accent hover:text-accent"
            >
              Create agent
            </Link>
          </div>
        </header>

        <AgentsCatalog agents={agents} presets={presets} />
      </div>
    </main>
  );
}
