import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';

import { PresetCard } from '@/components/preset-card';
import { IntroPoolCounter } from '@/components/intro-pool-counter';
import { DEFAULT_PREMIUM_MODEL_ID, PREMIUM_MODEL_OPTIONS } from '@/lib/ai';
import { CREDIT_PACKAGES } from '@/lib/credit-catalog';
import {
  BYOK_ENABLED,
  CREDITS_ENABLED,
  CREDIT_VALUE_GBP,
  formatCredits,
  getCreditBalanceMicro,
} from '@/lib/credits';
import { getIntroPoolStatus } from '@/lib/intro-pool';
import { ALL_PRESETS } from '@/lib/presets';

import { createBout, createCreditCheckout } from '../actions';

export const metadata = {
  title: 'Arena — THE PIT',
  description: 'Pick your preset and watch AI personas clash in real time.',
};

export default async function Home() {
  const premiumEnabled = process.env.PREMIUM_ENABLED === 'true';
  const creditsEnabled = CREDITS_ENABLED;
  const { userId } = await auth();
  const creditBalanceMicro =
    creditsEnabled && userId ? await getCreditBalanceMicro(userId) : null;
  const showCreditPrompt = creditsEnabled && !userId;
  const poolStatus = creditsEnabled ? await getIntroPoolStatus() : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-12">
        <header className="flex flex-col gap-5 border-b-2 border-foreground/70 pb-8">
          <h1 className="font-sans text-4xl uppercase tracking-tight md:text-5xl">
            AI Battle Arena
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            Pick a preset. The arena will spin up a round-robin debate and stream
            each agent in real time. No poker math, no calculators, just chaos.
          </p>
          {creditsEnabled && creditBalanceMicro !== null && (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.3em] text-muted">
              <span className="rounded-full border-2 border-foreground/60 px-3 py-1">
                Credits: {formatCredits(creditBalanceMicro)}
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-muted">
                1 credit = £{CREDIT_VALUE_GBP.toFixed(2)}
              </span>
            </div>
          )}
          {showCreditPrompt && (
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted">
              Sign in to track credits and history.
            </p>
          )}
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
                credits left
              </span>
              {poolStatus.exhausted && (
                <span className="text-[10px] uppercase tracking-[0.25em] text-muted">
                  Pool drained
                </span>
              )}
            </div>
          )}
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <Link
            href="/arena/custom"
            className="group flex h-full flex-col gap-4 border-2 border-foreground/80 bg-black/60 p-6 shadow-[8px_8px_0_rgba(255,255,255,0.15)] transition hover:-translate-y-1"
          >
            <p className="text-xs uppercase tracking-[0.35em] text-muted">
              Arena Mode
            </p>
            <h3 className="mt-2 font-sans text-2xl uppercase tracking-tight">
              Build your own lineup
            </h3>
            <p className="text-xs text-muted">
              Select 2–6 agents, set a topic, and unleash custom chaos.
            </p>
            <span className="mt-auto text-xs uppercase tracking-[0.3em] text-accent">
              Start building →
            </span>
          </Link>
          {ALL_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              action={createBout.bind(null, preset.id)}
              locked={preset.tier === 'premium' && !premiumEnabled}
              premiumEnabled={premiumEnabled}
              premiumModels={PREMIUM_MODEL_OPTIONS}
              defaultPremiumModel={DEFAULT_PREMIUM_MODEL_ID}
              byokEnabled={BYOK_ENABLED}
            />
          ))}
        </section>

        {creditsEnabled && (
          <section className="flex flex-col gap-4 border-t-2 border-foreground/60 pt-8">
            <p className="text-xs uppercase tracking-[0.4em] text-accent">
              Credit Packs
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {CREDIT_PACKAGES.map((pack) => (
                <form
                  key={pack.id}
                  action={createCreditCheckout}
                  className="flex flex-col gap-3 border-2 border-foreground/70 bg-black/40 p-5"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">
                      {pack.name}
                    </p>
                    <p className="mt-2 text-2xl font-sans uppercase tracking-tight">
                      £{pack.priceGbp}
                    </p>
                  </div>
                  <p className="text-sm text-foreground">
                    {pack.credits} credits
                  </p>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">
                    +{Math.round(pack.bonusPercent * 100)}% bonus
                  </p>
                  <input type="hidden" name="packId" value={pack.id} />
                  <button
                    type="submit"
                    className="rounded-full border-2 border-foreground/60 px-3 py-2 text-xs uppercase tracking-[0.3em] text-muted transition hover:border-accent hover:text-accent"
                  >
                    Buy credits
                  </button>
                </form>
              ))}
            </div>
          </section>
        )}

        <footer className="text-xs uppercase tracking-[0.3em] text-muted">
          Zero monte carlo. Zero equity. Pure spectacle.
        </footer>
      </div>
    </main>
  );
}
