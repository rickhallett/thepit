import Link from 'next/link';

import { ArenaBuilder } from '@/components/arena-builder';
import { DEFAULT_PREMIUM_MODEL_ID, PREMIUM_MODEL_OPTIONS } from '@/lib/ai';
import { BYOK_ENABLED } from '@/lib/credits';
import { getAgentSnapshots } from '@/lib/agent-registry';
import { getCopy } from '@/lib/copy';

import { createArenaBout } from '../../actions';

export const metadata = {
  title: 'Arena Builder — THE PIT',
  description: 'Build a custom arena bout from the agent roster.',
};

export default async function ArenaBuilderPage({
  searchParams,
}: {
  searchParams?: Promise<{
    agent?: string | string[];
    topic?: string;
    from?: string;
  }>;
}) {
  const c = await getCopy();
  const premiumEnabled = process.env.PREMIUM_ENABLED === 'true';
  const agents = await getAgentSnapshots();
  const resolved = await searchParams;

  // Support pre-selection from re-roll links
  const agentParam = resolved?.agent;
  const initialAgentIds = Array.isArray(agentParam)
    ? agentParam
    : agentParam
      ? [agentParam]
      : [];
  const initialTopic = resolved?.topic ?? '';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="border-b-2 border-foreground/70 pb-6">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            {c.arenaBuilderPage.label}
          </p>
          <h1 className="mt-3 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            {resolved?.from ? c.arenaBuilderPage.titleReroll : c.arenaBuilderPage.titleNew}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            {resolved?.from
              ? c.arenaBuilderPage.descriptionReroll
              : c.arenaBuilderPage.descriptionNew}
          </p>
        </header>

        <ArenaBuilder
          agents={agents.map((agent) => ({
            id: agent.id,
            name: agent.name,
            presetName: agent.presetName,
            color: agent.color,
            avatar: agent.avatar,
          }))}
          action={createArenaBout}
          premiumEnabled={premiumEnabled}
          premiumModels={PREMIUM_MODEL_OPTIONS}
          defaultPremiumModel={DEFAULT_PREMIUM_MODEL_ID}
          byokEnabled={BYOK_ENABLED}
          initialAgentIds={initialAgentIds}
          initialTopic={initialTopic}
        />

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-foreground/70 pt-8 text-xs uppercase tracking-[0.3em] text-muted">
          <span>{c.arenaBuilderPage.footerTagline}</span>
          <Link href="/arena" className="transition hover:text-accent">
            {c.arenaBuilderPage.backToPresets}
          </Link>
        </footer>
      </div>
    </main>
  );
}
