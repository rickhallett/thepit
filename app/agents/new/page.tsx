import { AgentBuilder } from '@/components/agent-builder';
import { getCopy } from '@/lib/copy';

export default async function NewAgentPage() {
  const c = await getCopy();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="border-b-2 border-foreground/70 pb-6">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            {c.agentNew.label}
          </p>
          <h1 className="mt-3 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            {c.agentNew.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            {c.agentNew.description}
          </p>
        </header>

        <AgentBuilder />
      </div>
    </main>
  );
}
