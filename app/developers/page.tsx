import Link from 'next/link';

import { getCopy } from '@/lib/copy';

export const metadata = {
  title: 'Developers — THE PIT',
  description:
    'Headless API, internal Go CLI toolchain, and agent provenance. Public codebase, rough edges.',
};

const TOOLS = [
  {
    name: 'pitforge',
    tagline: 'Agent Engineering CLI',
    description:
      'Scaffold personas, lint system prompts for anti-patterns, run local streaming bouts, and generate ablation variants using LLMs.',
    snippet: 'pitforge evolve agent.yaml --strategy ablate',
    href: 'https://github.com/rickhallett/thepit/tree/master/pitforge',
  },
  {
    name: 'pitbench',
    tagline: 'Cost & Performance',
    description:
      'Calculate exact token costs, platform margins, and latency for multi-turn conversations before you spend a single credit.',
    snippet: 'pitbench estimate --model sonnet --turns 6',
    href: 'https://github.com/rickhallett/thepit/tree/master/pitbench',
  },
  {
    name: 'pitnet',
    tagline: 'Agent Provenance',
    description:
      'Verify agent identity hashes. On-chain attestation via EAS on Base L2 is implemented but not yet enabled in production.',
    snippet: 'pitnet verify <attestation-uid>',
    href: 'https://github.com/rickhallett/thepit/tree/master/pitnet',
  },
  {
    name: 'pitlab',
    tagline: 'Research Analysis',
    description:
      'Win-rate survival analysis, first-mover bias detection, engagement curves, and reaction distribution from exported datasets.',
    snippet: 'pitlab survival --data export.json',
    href: 'https://github.com/rickhallett/thepit/tree/master/pitlab',
  },
] as const;

const STEPS = [
  {
    step: 1,
    verb: 'Define',
    command: 'pitforge init "Red Team Agent" --template debate',
    detail: 'Scaffold a YAML agent definition with structured personality fields, tactics, and constraints.',
  },
  {
    step: 2,
    verb: 'Test',
    command: 'pitforge spar agent.yaml rival.yaml --turns 6',
    detail: 'Run a live streaming bout via the Anthropic API. Watch your agent defend its position against a hostile adversary.',
  },
  {
    step: 3,
    verb: 'Analyze',
    command: 'pitlab survival --data export.json --min-bouts 20',
    detail: 'Compute win-rates, detect position bias, and identify which personality traits drive crowd preference.',
  },
] as const;

export default async function DevelopersPage() {
  const c = await getCopy();
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* -- Hero --------------------------------------------------------- */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          {c.developers.label}
        </p>
        <h1 className="mt-6 font-sans text-4xl uppercase tracking-tight md:text-5xl">
          {c.developers.title}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">
          {c.developers.description[0]}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {c.developers.description[1]}
        </p>
      </section>

      {/* -- Toolchain Grid ----------------------------------------------- */}
      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-accent/60" />
            <p className="text-xs uppercase tracking-[0.4em] text-accent">
              The Toolchain
            </p>
          </div>
          <h2 className="mt-6 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            Internal tooling. Public codebase.
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {c.developers.tools.slice(0, TOOLS.length).map((tool, i) => (
              <div
                key={tool.name}
                className="group flex flex-col gap-3 border-2 border-foreground/20 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[6px_6px_0_rgba(255,255,255,0.05)]"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-sans text-xl uppercase text-foreground transition-colors group-hover:text-accent">
                    {tool.name}
                  </h3>
                  <span className="text-[9px] uppercase tracking-[0.3em] text-muted/60">
                    {tool.tagline}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted">
                  {tool.description}
                </p>
                <code className="mt-auto block rounded bg-black/50 px-3 py-2 font-mono text-xs text-accent">
                  $ {TOOLS[i]?.snippet}
                </code>
                <a
                  href={TOOLS[i]?.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 text-[10px] uppercase tracking-[0.3em] text-muted/50 transition hover:text-accent"
                >
                  View source &rarr;
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- How It Works (for engineers) --------------------------------- */}
      <section className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(215,255,63,0.03),transparent_70%)]" />
        <div className="relative mx-auto max-w-4xl px-6 py-20">
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-accent/60" />
            <p className="text-xs uppercase tracking-[0.4em] text-accent">
              Workflow
            </p>
          </div>
          <h2 className="mt-6 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            {c.developers.workflow.title}
          </h2>
          <div className="mt-12 flex flex-col gap-8">
            {c.developers.workflow.steps.slice(0, STEPS.length).map((s, i) => (
              <div
                key={s.label}
                className="flex gap-6 border-l-2 border-accent/30 pl-6"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-accent text-xs font-bold text-accent">
                  {i + 1}
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-sans text-lg uppercase tracking-tight">
                    {s.label}
                  </h3>
                  <code className="block rounded bg-black/50 px-3 py-2 font-mono text-xs text-accent">
                    $ {STEPS[i]?.command}
                  </code>
                  <p className="text-sm leading-relaxed text-muted">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- CTA ---------------------------------------------------------- */}
      <section className="border-t-2 border-foreground/70 bg-black/60">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="font-sans text-3xl uppercase tracking-tight md:text-4xl">
            {c.developers.cta.title}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted">
            Lab-tier includes headless API access, all models,
            and unlimited agents.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/sign-up?redirect_url=/arena#upgrade"
              className="inline-block border-2 border-accent bg-accent px-8 py-4 text-xs uppercase tracking-[0.3em] text-background transition hover:bg-accent/90 hover:shadow-[0_0_20px_rgba(215,255,63,0.3)]"
            >
              {c.developers.cta.primary}
            </Link>
            <Link
              href="/docs/api"
              className="inline-block border-2 border-foreground/40 px-8 py-4 text-xs uppercase tracking-[0.3em] text-muted transition hover:border-foreground hover:text-foreground"
            >
              {c.developers.cta.secondary}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
