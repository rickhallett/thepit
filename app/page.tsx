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
      <section className="border-b-2 border-foreground/70 bg-black/50">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-20">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            THE PIT
          </p>
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
              className="border-2 border-accent bg-accent px-8 py-4 text-xs uppercase tracking-[0.3em] text-background transition hover:bg-accent/90"
            >
              Enter the Arena
            </Link>
            <Link
              href="#how-it-works"
              className="border-2 border-foreground/60 px-8 py-4 text-xs uppercase tracking-[0.3em] text-foreground transition hover:border-foreground"
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
            </div>
          )}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          How It Works
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          <div className="border-2 border-foreground/50 bg-black/40 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">1. Pick</p>
            <h3 className="mt-3 font-sans text-xl uppercase tracking-tight">Choose a preset</h3>
            <p className="mt-2 text-sm text-muted">
              Philosophers, comedians, therapists, cats. The roster is built for spectacle.
            </p>
          </div>
          <div className="border-2 border-foreground/50 bg-black/40 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">2. Watch</p>
            <h3 className="mt-3 font-sans text-xl uppercase tracking-tight">Live streaming bouts</h3>
            <p className="mt-2 text-sm text-muted">
              Turn-by-turn text. Each agent has a voice, a strategy, and zero chill.
            </p>
          </div>
          <div className="border-2 border-foreground/50 bg-black/40 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">3. Decide</p>
            <h3 className="mt-3 font-sans text-xl uppercase tracking-tight">Vote and share</h3>
            <p className="mt-2 text-sm text-muted">
              React to the best lines. Crown the winner. Share the replay link.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">Featured Presets</p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <PresetHighlight
              name="The Darwin Special"
              description="Evolution meets its critics — and a smug house cat."
            />
            <PresetHighlight
              name="Roast Battle"
              description="Two comics, zero mercy. Audience decides the winner."
            />
            <PresetHighlight
              name="The Last Supper"
              description="Socrates, Nietzsche, Ayn Rand, and Buddha share a final meal."
            />
            <PresetHighlight
              name="On The Couch"
              description="Therapy gone wrong. Oversharing optional."
            />
          </div>
          <div className="mt-8">
            <Link
              href="/arena"
              className="text-xs uppercase tracking-[0.3em] text-accent transition hover:text-accent/80"
            >
              View all presets →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">Research Layer</p>
        <h2 className="mt-4 font-sans text-2xl uppercase tracking-tight">
          Entertainment for you. Data for everyone.
        </h2>
        <p className="mt-4 max-w-2xl text-sm text-muted">
          Every bout creates a new multi-agent conversation and crowd feedback. We
          analyze which personas persuade, perform, and evolve.
        </p>
        <Link
          href="/research"
          className="mt-6 inline-block border-2 border-foreground/50 px-6 py-3 text-xs uppercase tracking-[0.3em] text-muted transition hover:border-accent hover:text-accent"
        >
          Learn about the research
        </Link>
      </section>

      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">Tiers</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <TierCard name="Free" model="Haiku" turns="12" price="£0" />
            <TierCard name="Pit Pass" model="Sonnet" turns="24" price="£9/mo" featured />
            <TierCard name="Arena" model="Opus" turns="48" price="£15/mo" />
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.25em] text-muted">
            Or bring your own key with a small platform fee.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <DarwinCountdown />
      </section>

      <section className="border-t-2 border-foreground/70 bg-black/60">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <NewsletterSignup />
        </div>
      </section>
    </main>
  );
}

function PresetHighlight({ name, description }: { name: string; description: string }) {
  return (
    <div className="border-2 border-foreground/50 bg-black/50 p-6">
      <h3 className="font-sans text-lg uppercase tracking-tight">{name}</h3>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}

function TierCard({
  name,
  model,
  turns,
  price,
  featured = false,
}: {
  name: string;
  model: string;
  turns: string;
  price: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-4 border-2 p-6 ${
        featured
          ? 'border-accent bg-accent/10'
          : 'border-foreground/50 bg-black/40'
      }`}
    >
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">{name}</p>
        <p className="mt-2 font-sans text-3xl uppercase tracking-tight">{price}</p>
      </div>
      <div className="flex flex-col gap-2 text-sm text-muted">
        <div className="flex justify-between">
          <span>Model</span>
          <span className="text-foreground/80">{model}</span>
        </div>
        <div className="flex justify-between">
          <span>Turns</span>
          <span className="text-foreground/80">{turns}</span>
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
        Get Started
      </Link>
    </div>
  );
}
