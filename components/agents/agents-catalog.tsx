"use client";

// AgentsCatalog — client-side searchable grid of agent cards.
// Filters by name and archetype, navigates to agent detail on click.

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentSnapshot } from "@/lib/agents/types";

interface AgentsCatalogProps {
  agents: AgentSnapshot[];
}

export function AgentsCatalog({ agents }: AgentsCatalogProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredAgents = agents.filter((agent) => {
    const term = search.toLowerCase();
    const nameMatch = agent.name.toLowerCase().includes(term);
    const archetypeMatch = agent.archetype?.toLowerCase().includes(term);
    return nameMatch || archetypeMatch;
  });

  function handleAgentClick(agentId: string) {
    router.push(`/agents/${agentId}`);
  }

  return (
    <div>
      {/* Search input */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or archetype..."
        data-testid="agent-search"
        className="mb-6 w-full border border-stone-700 bg-stone-800 px-4 py-3 text-sm placeholder-stone-500 focus:border-stone-500 focus:outline-none"
      />

      {/* Agent grid */}
      {filteredAgents.length === 0 ? (
        <p className="text-stone-500">No agents found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => handleAgentClick(agent.id)}
              data-testid="agent-card"
              className="flex flex-col gap-2 border border-stone-700 bg-stone-900 p-4 text-left transition-colors hover:border-stone-500 hover:bg-stone-800"
            >
              <h2 className="text-lg font-bold">{agent.name}</h2>
              {agent.archetype && (
                <p className="text-sm text-stone-400">{agent.archetype}</p>
              )}
              <div className="mt-auto flex items-center gap-2 pt-2">
                {agent.tier && (
                  <span
                    className={`text-xs font-medium ${
                      agent.tier === "premium"
                        ? "text-amber-400"
                        : agent.tier === "custom"
                          ? "text-purple-400"
                          : "text-stone-500"
                    }`}
                  >
                    {agent.tier}
                  </span>
                )}
                {agent.tone && (
                  <span className="text-xs text-stone-500">{agent.tone}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
