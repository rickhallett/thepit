// Agents catalog page — displays all available agents in a searchable grid.
// Server component that fetches agents and passes to client AgentsCatalog.

import { getAgentSnapshots } from "@/lib/agents/registry";
import { AgentsCatalog } from "@/components/agents/agents-catalog";

export default async function AgentsPage() {
  const agents = await getAgentSnapshots();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Agents</h1>
      <p className="mb-6 text-stone-400">
        Browse and select agents for your debates.
      </p>
      <AgentsCatalog agents={agents} />
    </main>
  );
}
