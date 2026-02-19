import Link from 'next/link';

import { getCopy } from '@/lib/copy';
import { getLatestExportMetadata } from '@/lib/research-exports';

export const metadata = {
  title: 'Research — THE PIT',
  description: 'How The Pit turns chaotic AI bouts into research data.',
};

export default async function ResearchPage() {
  const c = await getCopy();
  const latestExport = await getLatestExportMetadata().catch(() => null);
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">{c.researchPage.label}</p>
        <h1 className="mt-6 font-sans text-4xl uppercase tracking-tight md:text-5xl">
          {c.researchPage.title}
        </h1>
        <p className="mt-6 text-lg text-muted">
          {c.researchPage.subtitle}
        </p>
      </section>

      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">{c.researchPage.whatWeStudy.title}</p>
          <ul className="mt-6 flex flex-col gap-3 text-sm text-muted">
            {c.researchPage.whatWeStudy.bullets.map((bullet) => (
              <li key={bullet}>• {bullet}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">{c.researchPage.dataHandling.title}</p>
        <p className="mt-4 text-sm text-muted">
          {c.researchPage.dataHandling.description}
        </p>
      </section>

      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">{c.researchPage.litReview.title}</p>
          <h2 className="mt-4 font-sans text-2xl uppercase tracking-tight md:text-3xl">
            {c.researchPage.litReview.subtitle}
          </h2>
          <p className="mt-4 text-sm text-muted">
            {c.researchPage.litReview.description}
          </p>
          <Link
            href="/research/citations"
            className="mt-6 inline-block border-2 border-accent px-6 py-3 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background"
          >
            {c.researchPage.litReview.cta}
          </Link>
        </div>
      </section>

      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">{c.researchPage.onChain.title}</p>
          <h2 className="mt-4 font-sans text-2xl uppercase tracking-tight md:text-3xl">
            {c.researchPage.onChain.subtitle}
          </h2>
          <p className="mt-4 text-sm text-muted">
            Every agent&apos;s DNA — its prompt, configuration, and manifest — is
            deterministically hashed (SHA-256). On-chain attestation via the
            Ethereum Attestation Service (EAS) on Base L2 is implemented in code
            but not yet enabled in production. When live, this will create an
            immutable, tamper-evident record of agent identity and lineage that
            anyone can verify independently.
          </p>
          <ul className="mt-6 flex flex-col gap-3 text-sm text-muted">
            {c.researchPage.onChain.bullets.map((bullet) => {
              const dashIdx = bullet.indexOf(' — ');
              if (dashIdx === -1) return <li key={bullet}>{bullet}</li>;
              return (
                <li key={bullet}>
                  <strong className="text-foreground">{bullet.slice(0, dashIdx)}</strong>
                  {' — '}
                  {bullet.slice(dashIdx + 3)}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          {c.researchPage.datasets.title}
        </p>
        <h2 className="mt-4 font-sans text-2xl uppercase tracking-tight md:text-3xl">
          {c.researchPage.datasets.subtitle}
        </h2>
        <p className="mt-4 text-sm text-muted">
          {c.researchPage.datasets.description}
        </p>
        {latestExport ? (
          <div className="mt-6 border-2 border-foreground/40 bg-black/60 p-6">
            <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.25em] text-muted">
              <span>Version: {latestExport.version}</span>
              <span>
                Generated:{' '}
                {new Date(latestExport.generatedAt).toLocaleDateString()}
              </span>
              <span>{latestExport.boutCount} bouts</span>
              <span>{latestExport.reactionCount} reactions</span>
              <span>{latestExport.voteCount} votes</span>
              <span>{latestExport.agentCount} agents</span>
            </div>
            <a
              href={`/api/research/export?id=${latestExport.id}`}
              className="mt-4 inline-block border-2 border-accent px-6 py-3 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background"
            >
              {c.researchPage.datasets.downloadCta}
            </a>
          </div>
        ) : (
          <p className="mt-6 text-xs uppercase tracking-[0.25em] text-muted">
            {c.researchPage.datasets.empty}
          </p>
        )}
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-accent">{c.researchPage.collaborate.title}</p>
          <p className="mt-4 text-sm text-muted">
            Researchers, writers, and builders — we want to hear from you.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-block border-2 border-accent px-6 py-3 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent hover:text-background"
          >
            {c.researchPage.collaborate.cta}
          </Link>
        </div>
      </section>


      <section className="mx-auto max-w-4xl px-6 py-12 text-center">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.3em] text-muted transition hover:text-accent"
        >
          {c.researchPage.backToThePit}
        </Link>
      </section>
    </main>
  );
}
