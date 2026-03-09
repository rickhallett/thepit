// Agent detail page — displays full agent information.
// Server component that fetches agent by ID.

import { notFound } from "next/navigation";
import { getAgentDetail } from "@/lib/agents/registry";
import { agentId } from "@/lib/common/types";
import { AgentDetails } from "@/components/agents/agent-details";

interface AgentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { id } = await params;
  const agent = await getAgentDetail(agentId(id));

  if (!agent) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <AgentDetails agent={agent} />
    </main>
  );
}
