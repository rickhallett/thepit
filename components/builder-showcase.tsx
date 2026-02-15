import Link from 'next/link';
import { getCopy } from '@/lib/copy';

/**
 * "For Builders" section on the landing page.
 *
 * Terminal-styled showcase of the CLI toolchain that repositions the product
 * from "entertainment toy" to "adversarial evaluation infrastructure" for
 * the AI engineer audience.
 *
 * Placed between the Research Layer and Pricing sections to create demand
 * before the pricing card answers it.
 */
export async function BuilderShowcase() {
  const c = await getCopy();
  return (
    <section className="relative border-y-2 border-foreground/70 bg-black/80 py-20">
      {/* Background grid accent */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(215,255,63,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(215,255,63,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="relative mx-auto grid max-w-5xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
        {/* Copy */}
        <div>
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-accent" />
            <p className="text-xs uppercase tracking-[0.4em] text-accent">
              {c.builderShowcase.label}
            </p>
          </div>
          <h2 className="mt-6 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            {c.builderShowcase.titleLine1}
            <br />
            {c.builderShowcase.titleLine2}
          </h2>
          <p className="mt-6 text-lg text-muted">
            {c.builderShowcase.subtitle}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {c.builderShowcase.description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/docs/api"
              className="group flex items-center justify-center gap-2 border-2 border-accent bg-accent/10 px-6 py-3 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background"
            >
              <span>{c.builderShowcase.ctaPrimary}</span>
              <span className="transition-transform group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
            <Link
              href="/developers"
              className="flex items-center justify-center gap-2 border-2 border-foreground/40 px-6 py-3 text-xs uppercase tracking-[0.3em] text-muted transition hover:border-foreground hover:text-foreground"
            >
              <span>{c.builderShowcase.ctaSecondary}</span>
            </Link>
          </div>
        </div>

        {/* Terminal window */}
        <div className="relative rounded-lg border-2 border-foreground/20 bg-[#0d0d0d] p-1 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          {/* Title bar */}
          <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
            <span className="ml-2 font-mono text-[10px] text-muted/60">
              pitforge &mdash; zsh
            </span>
          </div>
          {/* Terminal content */}
          <div className="p-6 font-mono text-xs leading-relaxed">
            <p className="text-muted">
              $ pitforge evolve agent.yaml --strategy ablate
            </p>
            <p className="mt-2 text-accent">
              &rarr; Generating 3 variants...
            </p>
            <p className="mt-1 text-foreground/80">
              &nbsp;&nbsp;&bull; agent-no-tone.yaml
            </p>
            <p className="text-foreground/80">
              &nbsp;&nbsp;&bull; agent-no-weakness.yaml
            </p>
            <p className="text-foreground/80">
              &nbsp;&nbsp;&bull; agent-no-quirks.yaml
            </p>
            <p className="mt-4 text-muted">
              $ pitforge spar agent.yaml agent-no-tone.yaml --turns 8
            </p>
            <p className="mt-2 text-accent">
              &rarr; Streaming bout (8 turns)...
            </p>
            <p className="mt-1 text-foreground/80">
              &nbsp;&nbsp;[Turn 1] Agent: &ldquo;Logic implies...&rdquo;
            </p>
            <p className="text-foreground/80">
              &nbsp;&nbsp;[Turn 2] No-Tone: &ldquo;I disagree
              fundamentally.&rdquo;
            </p>
            <p className="mt-4 border-l-2 border-accent pl-3 text-accent">
              Winner: Original Agent (Votes: 82%)
              <br />
              Insight: Tone drives engagement.
            </p>
            <p className="mt-4 animate-pulse text-accent" aria-hidden="true">
              _
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
