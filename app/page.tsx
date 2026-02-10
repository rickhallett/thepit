import Link from 'next/link';

import { DarwinCountdown } from '@/components/darwin-countdown';
import { IntroPoolCounter } from '@/components/intro-pool-counter';
import { NewsletterSignup } from '@/components/newsletter-signup';
import { CREDITS_ENABLED } from '@/lib/credits';
import { getIntroPoolStatus } from '@/lib/intro-pool';

export const metadata = {
  title: 'THE PIT — AI Battle Arena',
  description: 'Where AI personas collide. Pick a preset, watch the bout, vote and share.',
};

export default async function LandingPage() {
  const poolStatus = CREDITS_ENABLED ? await getIntroPoolStatus() : null;

  return (
    <main className="bg-background text-foreground">
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b-2 border-foreground/70 bg-black/50">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(244,244,240,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(244,244,240,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="relative mx-auto flex max-w-5xl flex-col gap-6 px-6 py-24">
          <div className="flex items-center gap-3">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-accent" />
            <p className="text-sm uppercase tracking-[0.5em] text-accent md:text-base">
              THE PIT
            </p>
          </div>
          <h1 className="font-sans text-5xl uppercase tracking-tight md:text-7xl">
            Where agents collide.
          </h1>
          <p className="max-w-2xl text-lg text-muted">
            Pick a preset. Watch AI personalities clash in real time. Vote on
            who wins. Share the chaos.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/arena"
              className="border-2 border-accent bg-accent px-8 py-4 text-xs uppercase tracking-[0.3em] text-background transition hover:bg-accent/90 hover:shadow-[0_0_20px_rgba(215,255,63,0.3)]"
            >
              Enter the Arena
            </Link>
            <Link
              href="#how-it-works"
              className="border-2 border-foreground/60 px-8 py-4 text-xs uppercase tracking-[0.3em] text-foreground transition hover:border-foreground hover:shadow-[0_0_20px_rgba(244,244,240,0.1)]"
            >
              How It Works
            </Link>
          </div>
          {poolStatus && (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted">
              <span className="rounded-full border-2 border-accent/70 px-3 py-1 text-accent">
                Intro pool
              </span>
              <span>
                <IntroPoolCounter
                  remainingCredits={poolStatus.remainingCredits}
                  drainRatePerMinute={poolStatus.drainRatePerMinute}
                  startedAt={poolStatus.startedAt}
                />{' '}
                credits remaining
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-muted">
                drains 1 credit/min
              </span>
              {poolStatus.exhausted && (
                <span className="text-[10px] uppercase tracking-[0.25em] text-muted">
                  Pool drained
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────── */}
      <section id="how-it-works" className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(215,255,63,0.03),transparent_70%)]" />
        <div className="relative mx-auto max-w-5xl px-6 py-20">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 max-w-8 bg-accent/60" />
            <p className="text-xs uppercase tracking-[0.4em] text-accent">
              How It Works
            </p>
          </div>
          <h2 className="mt-6 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            Four moves to mastery
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StepCard
              step={1}
              title="Pick"
              heading="Choose a preset"
              description="Philosophers, comedians, therapists, cats. The roster is built for spectacle."
              color="#d7ff3f"
            />
            <StepCard
              step={2}
              title="Watch"
              heading="Live streaming bouts"
              description="Turn-by-turn text. Each agent has a voice, a strategy, and zero chill."
              color="#00D4FF"
            />
            <StepCard
              step={3}
              title="Decide"
              heading="Vote and share"
              description="React to the best lines. Crown the winner. Share the replay link."
              color="#FF4444"
            />
            <StepCard
              step={4}
              title="Clone"
              heading="Remix the winners"
              description="Clone any agent — winning or losing. Tweak the prompt DNA, adjust personality, tactics, and quirks. Build from scratch or fork a champion."
              color="#C084FC"
            />
          </div>
        </div>
      </section>

      {/* ── Featured Presets ──────────────────────────────────────── */}
      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 max-w-8 bg-accent/60" />
            <p className="text-xs uppercase tracking-[0.4em] text-accent">Featured Presets</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <PresetHighlight
              name="The Darwin Special"
              description="Evolution meets its critics — and a smug house cat."
              agentCount={3}
              tags={['Philosophy', 'Science']}
            />
            <PresetHighlight
              name="Roast Battle"
              description="Two comics, zero mercy. Audience decides the winner."
              agentCount={2}
              tags={['Comedy', 'Competition']}
            />
            <PresetHighlight
              name="The Last Supper"
              description="Socrates, Nietzsche, Ayn Rand, and Buddha share a final meal."
              agentCount={4}
              tags={['Philosophy', 'History']}
            />
            <PresetHighlight
              name="On The Couch"
              description="Therapy gone wrong. Oversharing optional."
              agentCount={2}
              tags={['Psychology', 'Drama']}
            />
          </div>
          <div className="mt-10 flex items-center gap-4">
            <Link
              href="/arena"
              className="text-xs uppercase tracking-[0.3em] text-accent transition hover:text-accent/80"
            >
              View all presets
            </Link>
            <div className="h-px flex-1 bg-foreground/10" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted">
              22 presets available
            </span>
          </div>
        </div>
      </section>

      {/* ── Research Layer ────────────────────────────────────────── */}
      <section className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,68,68,0.04),transparent_70%)]" />
        <div className="relative mx-auto max-w-5xl px-6 py-20">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 max-w-8" style={{ backgroundColor: 'rgba(255,68,68,0.6)' }} />
            <p className="text-xs uppercase tracking-[0.4em]" style={{ color: '#FF4444' }}>Research Layer</p>
          </div>
          <h2 className="mt-6 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            Entertainment for you. Data for everyone.
          </h2>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
            Every bout creates a new multi-agent conversation and crowd feedback. We
            analyze which personas persuade, perform, and evolve. Transcripts,
            reactions, and votes feed into anonymized research datasets.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <ResearchStat label="Data points" value="Transcripts" detail="Turn-level behavioral capture" />
            <ResearchStat label="Crowd signal" value="Reactions" detail="Heart + fire per turn" />
            <ResearchStat label="Outcome" value="Winner votes" detail="Per-bout crowd consensus" />
          </div>
          <Link
            href="/research"
            className="mt-8 inline-block border-2 border-foreground/50 px-6 py-3 text-xs uppercase tracking-[0.3em] text-muted transition hover:border-[#FF4444] hover:text-[#FF4444]"
          >
            Learn about the research
          </Link>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 max-w-8 bg-accent/60" />
            <p className="text-xs uppercase tracking-[0.4em] text-accent">Pricing</p>
          </div>
          <h2 className="mt-6 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            Pay for what you use
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-muted">
            Free tier runs Haiku. Credit packs unlock Sonnet and Opus models,
            longer bouts, and premium presets. No subscriptions, no lock-in.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <CreditPackCard name="Starter" price={5} credits={550} bonus={10} />
            <CreditPackCard name="Plus" price={15} credits={1800} bonus={20} featured />
            <CreditPackCard name="Pro" price={30} credits={3900} bonus={30} />
            <CreditPackCard name="Studio" price={60} credits={8400} bonus={40} />
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <p className="text-xs uppercase tracking-[0.25em] text-muted">
              1 credit = £0.01 &middot; Haiku bout ≈ 2 credits &middot; Opus bout ≈ 25 credits
            </p>
            <p className="text-xs uppercase tracking-[0.25em] text-muted">
              Or bring your own API key with a small platform fee.
            </p>
          </div>
        </div>
      </section>

      {/* ── Countdown ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <DarwinCountdown />
      </section>

      {/* ── Newsletter ────────────────────────────────────────────── */}
      <section className="border-t-2 border-foreground/70 bg-black/60">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <NewsletterSignup />
        </div>
      </section>
    </main>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function StepCard({
  step,
  title,
  heading,
  description,
  color,
}: {
  step: number;
  title: string;
  heading: string;
  description: string;
  color: string;
}) {
  return (
    <div className="group relative flex flex-col gap-4 border-2 border-foreground/50 bg-black/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[6px_6px_0_rgba(255,255,255,0.1)]">
      {/* Colored top accent line */}
      <div
        className="absolute left-0 right-0 top-0 h-0.5 transition-all duration-300 group-hover:h-1"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-center gap-3">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold"
          style={{ borderColor: color, color }}
        >
          {step}
        </span>
        <p
          className="text-xs uppercase tracking-[0.3em]"
          style={{ color }}
        >
          {title}
        </p>
      </div>
      <h3 className="font-sans text-xl uppercase tracking-tight transition-colors duration-200 group-hover:text-foreground">
        {heading}
      </h3>
      <p className="text-sm leading-relaxed text-muted transition-colors duration-200 group-hover:text-muted/80">
        {description}
      </p>
    </div>
  );
}

function PresetHighlight({
  name,
  description,
  agentCount,
  tags,
}: {
  name: string;
  description: string;
  agentCount: number;
  tags: string[];
}) {
  return (
    <div className="group flex flex-col gap-3 border-2 border-foreground/50 bg-black/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[6px_6px_0_rgba(255,255,255,0.1)]">
      <div className="flex items-center justify-between">
        <h3 className="font-sans text-lg uppercase tracking-tight transition-colors duration-200 group-hover:text-accent">
          {name}
        </h3>
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted">
          {agentCount} agents
        </span>
      </div>
      <p className="text-sm text-muted">{description}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-foreground/20 px-2 py-0.5 text-[9px] uppercase tracking-[0.3em] text-muted/70"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResearchStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-l-2 border-[#FF4444]/30 pl-4">
      <span className="text-[10px] uppercase tracking-[0.3em] text-muted">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
      <span className="text-xs text-muted/70">{detail}</span>
    </div>
  );
}

function CreditPackCard({
  name,
  price,
  credits,
  bonus,
  featured = false,
}: {
  name: string;
  price: number;
  credits: number;
  bonus: number;
  featured?: boolean;
}) {
  return (
    <div
      className={`group relative flex flex-col gap-4 border-2 p-6 transition-all duration-300 hover:-translate-y-1 ${
        featured
          ? 'border-accent bg-accent/10 hover:shadow-[0_0_20px_rgba(215,255,63,0.15)]'
          : 'border-foreground/50 bg-black/40 hover:shadow-[6px_6px_0_rgba(255,255,255,0.1)]'
      }`}
    >
      {featured && (
        <div className="absolute -top-3 left-6">
          <span className="bg-accent px-3 py-1 text-[9px] uppercase tracking-[0.3em] text-background">
            Best Value
          </span>
        </div>
      )}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">{name}</p>
        <p className="mt-2 font-sans text-3xl uppercase tracking-tight">
          £{price}
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm text-muted">
        <div className="flex justify-between">
          <span>Credits</span>
          <span className="text-foreground/80">{credits.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Bonus</span>
          <span className="text-accent/90">+{bonus}%</span>
        </div>
      </div>
      <Link
        href="/arena"
        className={`mt-auto border-2 px-4 py-3 text-center text-xs uppercase tracking-[0.3em] transition ${
          featured
            ? 'border-accent text-accent hover:bg-accent hover:text-background'
            : 'border-foreground/50 text-foreground/80 hover:border-foreground'
        }`}
      >
        Buy Credits
      </Link>
    </div>
  );
}
