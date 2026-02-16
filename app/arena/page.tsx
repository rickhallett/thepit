import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';

import { Suspense } from 'react';
import { PresetCard } from '@/components/preset-card';
import { CheckoutBanner } from '@/components/checkout-banner';
import { BuyCreditsButton } from '@/components/buy-credits-button';
import { IntroPoolCounter } from '@/components/intro-pool-counter';
import { FreeBoutCounter } from '@/components/free-bout-counter';
import { DEFAULT_PREMIUM_MODEL_ID, PREMIUM_MODEL_OPTIONS } from '@/lib/ai';
import { CREDIT_PACKAGES } from '@/lib/credit-catalog';
import {
  BYOK_ENABLED,
  CREDITS_ADMIN_ENABLED,
  CREDITS_ENABLED,
  CREDIT_VALUE_GBP,
  formatCredits,
  getCreditTransactions,
  getCreditBalanceMicro,
} from '@/lib/credits';
import { getIntroPoolStatus } from '@/lib/intro-pool';
import { getFreeBoutPoolStatus } from '@/lib/free-bout-pool';
import {
  SUBSCRIPTIONS_ENABLED,
  getUserTier,
  TIER_CONFIG,
  getAvailableModels,
  getFreeBoutsUsed,
} from '@/lib/tier';
import { ALL_PRESETS } from '@/lib/presets';
import { getCopy } from '@/lib/copy';

import {
  createBout,
  createCreditCheckout,
  createSubscriptionCheckout,
  createBillingPortal,
  grantTestCredits,
} from '../actions';

export const metadata = {
  title: 'Arena — THE PIT',
  description: 'Pick your preset and watch AI personas clash in real time.',
};

/** Arena page: preset grid with tier-aware model access, free bout counter, and upgrade section. */
export default async function ArenaPage() {
  const c = await getCopy();
  const creditsEnabled = CREDITS_ENABLED;
  const subsEnabled = SUBSCRIPTIONS_ENABLED;
  const { userId } = await auth();

  // Fire independent queries in parallel to avoid sequential DB waterfalls
  const [userTier, creditBalanceMicro, creditHistory, poolStatus, freeBoutPoolStatus] =
    await Promise.all([
      subsEnabled && userId ? getUserTier(userId) : Promise.resolve(null),
      creditsEnabled && userId ? getCreditBalanceMicro(userId) : Promise.resolve(null),
      creditsEnabled && userId ? getCreditTransactions(userId, 12) : Promise.resolve([] as Awaited<ReturnType<typeof getCreditTransactions>>),
      creditsEnabled ? getIntroPoolStatus() : Promise.resolve(null),
      subsEnabled ? getFreeBoutPoolStatus() : Promise.resolve(null),
    ]);

  // Tier-dependent follow-up (needs userTier result)
  const tierConfig = userTier ? TIER_CONFIG[userTier] : null;
  const availableModels = userTier ? getAvailableModels(userTier) : PREMIUM_MODEL_OPTIONS;
  const freeBoutsUsed = subsEnabled && userId && userTier === 'free'
    ? await getFreeBoutsUsed(userId)
    : null;

  // Legacy premium flag (used when subscriptions are disabled)
  const premiumEnabled = !subsEnabled && process.env.PREMIUM_ENABLED === 'true';
  const showCreditPrompt = creditsEnabled && !userId;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-12">
        <header className="flex flex-col gap-5 border-b-2 border-foreground/70 pb-8">
          <h1 className="font-sans text-4xl uppercase tracking-tight md:text-5xl">
            {c.arena.title}
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            {c.arena.description}
          </p>
          {creditsEnabled && creditBalanceMicro !== null && (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.3em] text-muted">
              <span className="rounded-full border-2 border-foreground/60 px-3 py-1">
                {c.arena.credits.label} {formatCredits(creditBalanceMicro)}
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-muted">
                {c.arena.credits.rateLabel.replace('{rate}', CREDIT_VALUE_GBP.toFixed(2))}
              </span>
              {CREDITS_ADMIN_ENABLED && userId && (
                <form action={grantTestCredits}>
                  <button
                    type="submit"
                    className="rounded-full border-2 border-foreground/50 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-muted transition hover:border-accent hover:text-accent"
                  >
                    {c.arena.credits.addCredits}
                  </button>
                </form>
              )}
            </div>
          )}
          {/* Tier badge and subscription status */}
          {subsEnabled && userId && userTier && tierConfig && (
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <span className={`rounded-full border-2 px-3 py-1 text-xs uppercase tracking-[0.3em] ${
                userTier === 'lab'
                  ? 'border-purple-400 text-purple-400'
                  : userTier === 'pass'
                    ? 'border-accent text-accent'
                    : 'border-foreground/60 text-muted'
              }`}>
                {userTier === 'lab' ? c.arena.tier.pitLab : userTier === 'pass' ? c.arena.tier.pitPass : c.arena.tier.free}
              </span>
              {userTier === 'free' && freeBoutsUsed !== null && tierConfig.lifetimeBoutCap !== null && (
                <span className="text-xs uppercase tracking-[0.25em] text-muted">
                  {c.arena.tier.boutsRemaining.replace('{remaining}', String(tierConfig.lifetimeBoutCap - freeBoutsUsed)).replace('{total}', String(tierConfig.lifetimeBoutCap))}
                </span>
              )}
              {userTier !== 'free' && (
                <form action={createBillingPortal}>
                  <button
                    type="submit"
                    className="text-[10px] uppercase tracking-[0.25em] text-muted transition hover:text-accent"
                  >
                    {c.arena.tier.manageSubscription}
                  </button>
                </form>
              )}
              {userTier === 'free' && (
                <Link
                  href="#upgrade"
                  className="text-[10px] uppercase tracking-[0.25em] text-accent transition hover:text-accent/80"
                >
                  {c.arena.tier.upgradePlan}
                </Link>
              )}
            </div>
          )}
          {showCreditPrompt && (
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted">
              {c.arena.credits.signInPrompt}
            </p>
          )}
          {/* Free bout pool counter */}
          {freeBoutPoolStatus && (
            <div className="mt-4 max-w-sm">
              <FreeBoutCounter
                used={freeBoutPoolStatus.used}
                max={freeBoutPoolStatus.max}
                remaining={freeBoutPoolStatus.remaining}
              />
            </div>
          )}
          {poolStatus && (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted">
              <span className="rounded-full border-2 border-accent/70 px-3 py-1 text-accent">
                {c.arena.credits.introPoolLabel}
              </span>
              <span>
                <IntroPoolCounter
                  remainingCredits={poolStatus.remainingCredits}
                  drainRatePerMinute={poolStatus.drainRatePerMinute}
                  startedAt={poolStatus.startedAt}
                />{' '}
                {c.arena.credits.creditsLeft}
              </span>
              {poolStatus.exhausted && (
                <Link
                  href="/sign-up?redirect_url=/arena"
                  className="rounded-full border-2 border-accent/70 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-accent transition hover:bg-accent/10"
                >
                  {c.arena.credits.poolDrained}
                </Link>
              )}
            </div>
          )}
        </header>

        <Suspense>
          <CheckoutBanner />
        </Suspense>

        <section className="grid gap-6 md:grid-cols-2">
          <Link
            href="/arena/custom"
            className="group flex h-full flex-col gap-4 border-2 border-foreground/80 bg-black/60 p-6 shadow-[8px_8px_0_rgba(255,255,255,0.15)] transition hover:-translate-y-1"
          >
            <p className="text-xs uppercase tracking-[0.35em] text-muted">
              {c.arena.customBout.label}
            </p>
            <h3 className="mt-2 font-sans text-2xl uppercase tracking-tight">
              {c.arena.customBout.title}
            </h3>
            <p className="text-xs text-muted">
              {c.arena.customBout.description}
            </p>
            <span className="mt-auto text-xs uppercase tracking-[0.3em] text-accent">
              {c.arena.customBout.cta}
            </span>
          </Link>
          {ALL_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              action={createBout.bind(null, preset.id)}
              locked={
                subsEnabled
                  ? false // Tier checks happen server-side in run-bout
                  : preset.tier === 'premium' && !premiumEnabled
              }
              premiumEnabled={subsEnabled || premiumEnabled}
              premiumModels={subsEnabled ? availableModels : PREMIUM_MODEL_OPTIONS}
              defaultPremiumModel={
                subsEnabled
                  ? availableModels[availableModels.length - 1] ?? DEFAULT_PREMIUM_MODEL_ID
                  : DEFAULT_PREMIUM_MODEL_ID
              }
              byokEnabled={BYOK_ENABLED}
            />
          ))}
        </section>

        {/* Subscription upgrade section */}
        {subsEnabled && userTier !== 'lab' && (
          <section id="upgrade" className="flex flex-col gap-4 border-t-2 border-foreground/60 pt-8">
            <p className="text-xs uppercase tracking-[0.4em] text-accent">
              {userId ? c.arena.upgrade.upgradeTitle : c.arena.upgrade.chooseTitle}
            </p>
            {!userId && (
              <p className="text-xs text-muted">
                {c.arena.upgrade.signUpDescription}
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {(!userId || userTier === 'free') && (
                userId ? (
                  <form
                    action={createSubscriptionCheckout}
                    className="flex flex-col gap-3 border-2 border-accent/60 bg-accent/5 p-5"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-accent">{c.arena.tier.pitPass}</p>
                      <p className="mt-2 text-2xl font-sans uppercase tracking-tight">
                        £3<span className="text-sm text-muted">/mo</span>
                      </p>
                    </div>
                    <p className="text-xs text-muted">
                      {c.arena.upgrade.passDescription}
                    </p>
                    <input type="hidden" name="plan" value="pass" />
                    <button
                      type="submit"
                      className="mt-auto border-2 border-accent px-4 py-3 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background"
                    >
                      {c.arena.upgrade.subscribe}
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-3 border-2 border-accent/60 bg-accent/5 p-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-accent">{c.arena.tier.pitPass}</p>
                      <p className="mt-2 text-2xl font-sans uppercase tracking-tight">
                        £3<span className="text-sm text-muted">/mo</span>
                      </p>
                    </div>
                    <p className="text-xs text-muted">
                      {c.arena.upgrade.passDescription}
                    </p>
                    <Link
                      href="/sign-up?redirect_url=/arena#upgrade"
                      className="mt-auto border-2 border-accent px-4 py-3 text-center text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background"
                    >
                      {c.arena.upgrade.signUpToSubscribe}
                    </Link>
                  </div>
                )
              )}
              {userId ? (
                <form
                  action={createSubscriptionCheckout}
                  className="flex flex-col gap-3 border-2 border-purple-400/60 bg-purple-400/5 p-5"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-purple-400">{c.arena.tier.pitLab}</p>
                    <p className="mt-2 text-2xl font-sans uppercase tracking-tight">
                      £10<span className="text-sm text-muted">/mo</span>
                    </p>
                  </div>
                  <p className="text-xs text-muted">
                    {c.arena.upgrade.labDescription}
                  </p>
                  <input type="hidden" name="plan" value="lab" />
                  <button
                    type="submit"
                    className="mt-auto border-2 border-purple-400 px-4 py-3 text-xs uppercase tracking-[0.3em] text-purple-400 transition hover:bg-purple-400 hover:text-background"
                  >
                    {c.arena.upgrade.subscribe}
                  </button>
                </form>
              ) : (
                <div className="flex flex-col gap-3 border-2 border-purple-400/60 bg-purple-400/5 p-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-purple-400">{c.arena.tier.pitLab}</p>
                    <p className="mt-2 text-2xl font-sans uppercase tracking-tight">
                      £10<span className="text-sm text-muted">/mo</span>
                    </p>
                  </div>
                  <p className="text-xs text-muted">
                    {c.arena.upgrade.labDescription}
                  </p>
                  <Link
                    href="/sign-up?redirect_url=/arena#upgrade"
                    className="mt-auto border-2 border-purple-400 px-4 py-3 text-center text-xs uppercase tracking-[0.3em] text-purple-400 transition hover:bg-purple-400 hover:text-background"
                  >
                    {c.arena.upgrade.signUpToSubscribe}
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}

        {creditsEnabled && (
          <section className="flex flex-col gap-4 border-t-2 border-foreground/60 pt-8">
            <p className="text-xs uppercase tracking-[0.4em] text-accent">
              {c.arena.creditPacks.label}
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
                  <BuyCreditsButton />
                </form>
              ))}
            </div>
          </section>
        )}

        {creditsEnabled && userId && (
          <section className="flex flex-col gap-4 border-t-2 border-foreground/60 pt-8">
            <p className="text-xs uppercase tracking-[0.4em] text-accent">
              {c.arena.creditHistory.label}
            </p>
            {creditHistory.length === 0 ? (
              <p className="text-xs uppercase tracking-[0.3em] text-muted">
                {c.arena.creditHistory.empty}
              </p>
            ) : (
              <div className="relative">
              <div className="overflow-x-auto border-2 border-foreground/60">
                <div className="grid min-w-[520px] grid-cols-[minmax(0,2fr)_110px_120px_120px] gap-4 border-b-2 border-foreground/60 bg-black/60 px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-muted">
                  <span>{c.arena.creditHistory.columns.when}</span>
                  <span>{c.arena.creditHistory.columns.source}</span>
                  <span className="text-right">{c.arena.creditHistory.columns.delta}</span>
                  <span className="text-right">{c.arena.creditHistory.columns.reference}</span>
                </div>
                {creditHistory.map((row) => {
                  const delta =
                    row.deltaMicro >= 0
                      ? `+${formatCredits(row.deltaMicro)}`
                      : `-${formatCredits(Math.abs(row.deltaMicro))}`;
                  return (
                    <div
                      key={`${row.source}-${row.createdAt?.toISOString()}`}
                      className="grid min-w-[520px] grid-cols-[minmax(0,2fr)_110px_120px_120px] gap-4 border-b border-foreground/40 px-4 py-3 text-xs uppercase tracking-[0.25em] text-muted"
                    >
                      <span>
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString()
                          : '—'}
                      </span>
                      <span>{row.source}</span>
                      <span className="text-right text-foreground">{delta}</span>
                      <span className="text-right">
                        {row.referenceId ?? '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-l from-background to-transparent md:hidden" />
              </div>
            )}
          </section>
        )}

        <footer className="text-xs uppercase tracking-[0.3em] text-muted">
          {c.arena.tagline}
        </footer>
      </div>
    </main>
  );
}
