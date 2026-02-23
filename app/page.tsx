import Link from 'next/link';

import { auth } from '@clerk/nextjs/server';

import { BuilderShowcase } from '@/components/builder-showcase';
import { VideoExplainerButton } from '@/components/video-modal';

import { IntroPoolCounter } from '@/components/intro-pool-counter';
import { NewsletterSignup } from '@/components/newsletter-signup';
import { SITE_DESCRIPTION } from '@/lib/brand';
import { CREDITS_ENABLED } from '@/lib/credits';
import { getIntroPoolStatus } from '@/lib/intro-pool';
import { getCopy } from '@/lib/copy';

export const metadata = {
  title: 'THE PIT — Trust Infrastructure for AI Agents',
  description: SITE_DESCRIPTION,
};

/** Server-rendered landing page with hero, presets, pricing, and research stats. */
export default async function LandingPage() {
  const [poolStatus, c, { userId }] = await Promise.all([
    CREDITS_ENABLED ? getIntroPoolStatus() : Promise.resolve(null),
    getCopy(),
    auth(),
  ]);
  const isSignedIn = !!userId;

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
              {c.hero.badge}
            </p>
          </div>
          <h1 className="font-sans text-5xl uppercase tracking-tight md:text-7xl">
            {c.hero.headline}
          </h1>
          <p className="max-w-2xl text-lg text-muted">
            {c.hero.subheadline}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/arena"
              className="border-2 border-accent bg-accent px-8 py-4 text-xs uppercase tracking-[0.3em] text-background transition hover:bg-accent/90 hover:shadow-[0_0_20px_rgba(215,255,63,0.3)]"
            >
              {c.hero.ctaPrimary}
            </Link>
            <Link
              href="#how-it-works"
              className="border-2 border-foreground/60 px-8 py-4 text-xs uppercase tracking-[0.3em] text-foreground transition hover:border-foreground hover:shadow-[0_0_20px_rgba(244,244,240,0.1)]"
            >
              {c.hero.ctaSecondary}
            </Link>
            <VideoExplainerButton />
          </div>
          {poolStatus && (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted">
               <span className="rounded-full border-2 border-accent/70 px-3 py-1 text-accent">
                {c.hero.introPool.label}
              </span>
              <span>
                <IntroPoolCounter
                  remainingCredits={poolStatus.remainingCredits}
                  halfLifeDays={poolStatus.halfLifeDays}
                />{' '}
                {c.hero.introPool.remaining}
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-muted">
                {c.hero.introPool.drainRate}
              </span>
              {poolStatus.exhausted && (
                <Link
                  href={isSignedIn ? '/arena' : '/sign-up?redirect_url=/arena'}
                  className="rounded-full border-2 border-accent/70 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-accent transition hover:bg-accent/10"
                >
                  {c.hero.introPool.drained}
                </Link>
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
              {c.howItWorks.label}
            </p>
          </div>
          <h2 className="mt-6 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            {c.howItWorks.title}
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {c.howItWorks.steps.map((step, i) => (
              <StepCard
                key={i}
                step={i + 1}
                title={step.title}
                heading={step.heading}
                description={step.description}
                color={['#d7ff3f', '#00D4FF', '#FF4444', '#C084FC'][i] ?? '#d7ff3f'}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Presets ──────────────────────────────────────── */}
      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 max-w-8 bg-accent/60" />
            <p className="text-xs uppercase tracking-[0.4em] text-accent">{c.featuredPresets.label}</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {c.featuredPresets.presets.map((preset) => (
              <PresetHighlight
                key={preset.name}
                name={preset.name}
                description={preset.description}
                agentCount={preset.agentCount}
                tags={preset.tags}
              />
            ))}
          </div>
          <div className="mt-10 flex items-center gap-4">
            <Link
              href="/arena"
              className="text-xs uppercase tracking-[0.3em] text-accent transition hover:text-accent/80"
            >
              {c.featuredPresets.viewAll}
            </Link>
            <div className="h-px flex-1 bg-foreground/10" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted">
              {c.featuredPresets.count}
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
            <p className="text-xs uppercase tracking-[0.4em]" style={{ color: '#FF4444' }}>{c.researchLayer.label}</p>
          </div>
          <h2 className="mt-6 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            {c.researchLayer.title}
          </h2>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
            {c.researchLayer.description}
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {c.researchLayer.stats.map((stat) => (
              <ResearchStat key={stat.label} label={stat.label} value={stat.value} detail={stat.detail} />
            ))}
          </div>
          <Link
            href="/research"
            className="mt-8 inline-block border-2 border-foreground/50 px-6 py-3 text-xs uppercase tracking-[0.3em] text-muted transition hover:border-[#FF4444] hover:text-[#FF4444]"
          >
            {c.researchLayer.cta}
          </Link>
        </div>
      </section>

      {/* ── For Builders ──────────────────────────────────────────── */}
      <BuilderShowcase />

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 max-w-8 bg-accent/60" />
            <p className="text-xs uppercase tracking-[0.4em] text-accent">{c.pricing.label}</p>
          </div>
          <h2 className="mt-6 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            {c.pricing.title}
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-muted">
            {c.pricing.description}
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <PlanCard
              name={c.pricing.plans[0]!.name}
              price={0}
              period=""
              href={isSignedIn ? '/arena' : '/sign-up?redirect_url=/arena'}
              cta={c.pricing.plans[0]!.cta}
              features={c.pricing.plans[0]!.features}
            />
            <PlanCard
              name={c.pricing.plans[1]!.name}
              price={3}
              period="/mo"
              featured
              href={isSignedIn ? '/arena#upgrade' : '/sign-up?redirect_url=/arena#upgrade'}
              cta={c.pricing.plans[1]!.cta}
              features={c.pricing.plans[1]!.features}
            />
            <PlanCard
              name={c.pricing.plans[2]!.name}
              price={10}
              period="/mo"
              href={isSignedIn ? '/arena#upgrade' : '/sign-up?redirect_url=/arena#upgrade'}
              cta={c.pricing.plans[2]!.cta}
              features={c.pricing.plans[2]!.features}
            />
          </div>

          {/* Credit top-ups */}
          <div className="mt-12 border-t border-foreground/20 pt-8">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">
              {c.pricing.creditPacks.label}
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-2 max-w-lg">
              <CreditPackCard name="Starter" price={3} credits={300} />
              <CreditPackCard name="Plus" price={8} credits={800} />
            </div>
            <p className="mt-4 text-xs text-muted">
              {c.pricing.creditPacks.byokNote}
            </p>
          </div>
        </div>
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

/** Numbered step card for the "How it works" section. */
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

/** Card highlighting a debate preset with agent count and category tags. */
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

/** Stat block for the research section showing a key metric with detail text. */
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

/** Subscription plan card with feature list and CTA button. */
function PlanCard({
  name,
  price,
  period,
  features,
  featured = false,
  href,
  cta,
}: {
  name: string;
  price: number;
  period: string;
  features: string[];
  featured?: boolean;
  href: string;
  cta: string;
}) {
  return (
    <div
      className={`group relative flex flex-col gap-4 border-2 p-6 transition-all duration-300 hover:-translate-y-1 ${
        featured
          ? 'border-accent bg-accent/10 hover:shadow-[0_0_20px_rgba(215,255,63,0.15)]'
          : 'border-foreground/50 bg-black/40 hover:shadow-[6px_6px_0_rgba(255,255,255,0.1)]'
      }`}
    >
      {/* "Most Popular" badge removed — Captain's QA decision (too generic for HN) */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">{name}</p>
        <p className="mt-2 font-sans text-3xl uppercase tracking-tight">
          {price === 0 ? 'Free' : `£${price}`}
          {period && (
            <span className="text-base text-muted">{period}</span>
          )}
        </p>
      </div>
      <ul className="flex flex-col gap-2 text-sm text-muted">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-0.5 text-accent">+</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`mt-auto border-2 px-4 py-3 text-center text-xs uppercase tracking-[0.3em] transition ${
          featured
            ? 'border-accent text-accent hover:bg-accent hover:text-background'
            : 'border-foreground/50 text-foreground/80 hover:border-foreground'
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

/** Compact credit pack purchase card with inline buy link. */
function CreditPackCard({
  name,
  price,
  credits,
}: {
  name: string;
  price: number;
  credits: number;
}) {
  return (
    <div className="group flex flex-col gap-3 border-2 border-foreground/50 bg-black/40 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[6px_6px_0_rgba(255,255,255,0.1)]">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">{name}</p>
        <p className="font-sans text-xl uppercase tracking-tight">£{price}</p>
      </div>
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{credits.toLocaleString()} credits</span>
        <Link
          href="/arena"
          className="text-xs uppercase tracking-[0.2em] text-accent transition hover:text-accent/80"
        >
          Buy
        </Link>
      </div>
    </div>
  );
}
