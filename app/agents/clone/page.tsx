import { notFound, redirect } from 'next/navigation';

import { getAgentDetail } from '@/lib/agent-detail';
import { decodeAgentId } from '@/lib/agent-links';
import { AgentBuilder } from '@/components/agent-builder';
import type { AgentBuilderInitialValues } from '@/components/agent-builder';
import type { ResponseLength } from '@/lib/response-lengths';
import type { ResponseFormatId } from '@/lib/response-formats';

export const metadata = {
  title: 'Clone Agent — THE PIT',
  description: 'Clone an existing agent and tweak it to your liking.',
};

export default async function CloneAgentPage({
  searchParams,
}: {
  searchParams: { source?: string } | Promise<{ source?: string }>;
}) {
  const resolved = await searchParams;
  const sourceId = resolved.source;

  if (!sourceId) {
    redirect('/agents/new');
  }

  const agentId = decodeAgentId(sourceId);
  const detail = await getAgentDetail(agentId, 1);

  if (!detail) {
    notFound();
  }

  const initialValues: AgentBuilderInitialValues = {
    name: `${detail.name} (clone)`,
    archetype: detail.archetype ?? undefined,
    tone: detail.tone ?? undefined,
    quirks: detail.quirks ?? undefined,
    speechPattern: detail.speechPattern ?? undefined,
    openingMove: detail.openingMove ?? undefined,
    signatureMove: detail.signatureMove ?? undefined,
    weakness: detail.weakness ?? undefined,
    goal: detail.goal ?? undefined,
    fears: detail.fears ?? undefined,
    customInstructions: detail.customInstructions ?? detail.systemPrompt ?? undefined,
    responseLength: (detail.responseLength as ResponseLength) ?? undefined,
    responseFormat: (detail.responseFormat as ResponseFormatId) ?? undefined,
    parentId: detail.id,
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="border-b-2 border-foreground/70 pb-6">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            Agent Lab
          </p>
          <h1 className="mt-3 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            Clone Agent
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Cloning <span className="text-foreground">{detail.name}</span>.
            Tweak any field to make it your own. The new agent will inherit
            lineage from the original.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.3em] text-muted">
            <span className="rounded-full border border-foreground/40 px-3 py-1">
              Source: {detail.name}
            </span>
            {detail.presetName && (
              <span className="rounded-full border border-foreground/40 px-3 py-1">
                Preset: {detail.presetName}
              </span>
            )}
            <span className="rounded-full border border-accent/50 px-3 py-1 text-accent">
              Lineage preserved
            </span>
          </div>
        </header>

        <AgentBuilder initialValues={initialValues} />
      </div>
    </main>
  );
}
