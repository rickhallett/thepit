import Link from 'next/link';

import { getCopy } from '@/lib/copy';
import { getLatestExportMetadata } from '@/lib/research-exports';

export const metadata = {
  title: 'Research — THE PIT',
  description:
    'Six pre-registered hypotheses on multi-agent LLM debate. 195 bouts, 2,100 turns, automated metrics, permutation tests.',
};

/* ------------------------------------------------------------------ */
/* Research programme data (hardcoded — factual, not A/B testable)     */
/* ------------------------------------------------------------------ */

const programmeStats = {
  bouts: 195,
  turns: '~2,100',
  hypotheses: 6,
  technicalFailures: 0,
};

type HypothesisRow = {
  id: string;
  title: string;
  question: string;
  design: string;
  result: 'clear' | 'null' | 'ambiguous';
  maxD: string;
  keyFinding: string;
  insight: string;
  githubPath: string;
};

const hypotheses: HypothesisRow[] = [
  {
    id: 'H1',
    title: 'Adversarial Refusal Cascade',
    question:
      'Does richer agent DNA reduce safety-layer refusals in adversarial presets?',
    design: '50 bouts, roast-battle + gloves-off. Baseline (~270 char DNA) vs enhanced (~1950 char XML DNA).',
    result: 'clear',
    maxD: '—',
    keyFinding:
      'Roast-battle refusals dropped 100% to 60%. Gloves-off: enhanced DNA eliminated all refusals.',
    insight:
      'Prompt engineering depth is a significant factor in multi-agent persona compliance on Claude.',
    githubPath: 'pitstorm/results/hypotheses/H1-analysis.md',
  },
  {
    id: 'H2',
    title: 'Position Advantage',
    question:
      'Does speaker position (first vs last) systematically affect output?',
    design: '25 bouts, 300 turns. Last Supper (4 agents) + Summit (6 agents).',
    result: 'clear',
    maxD: '3.584',
    keyFinding:
      'Novel vocabulary rate shows genuine position effect (d = 1.732 in 6-agent). Question density is persona-driven, not position-driven.',
    insight:
      'Turn position drives vocabulary novelty; persona identity drives conversational role.',
    githubPath: 'pitstorm/results/hypotheses/H2-preregistration.md',
  },
  {
    id: 'H3',
    title: 'Comedy vs Serious Framing',
    question:
      'Does a humorous premise produce more varied and less formulaic output?',
    design: '30 bouts, 360 turns. Comedy (first-contact + darwin-special) vs serious (on-the-couch).',
    result: 'clear',
    maxD: '1.300',
    keyFinding:
      'Serious agents produce 8x more hedging. House Cat and Conspiracy Theorist: zero hedging across 30 turns each.',
    insight:
      'The model\'s hedging register activates based on frame proximity to the assistant voice, not content difficulty.',
    githubPath: 'pitstorm/results/hypotheses/H3-analysis.md',
  },
  {
    id: 'H4',
    title: 'Agent Count Scaling',
    question:
      'How does the number of agents (2-6) affect per-agent output quality?',
    design: '50 bouts, 600 turns. Presets: first-contact (2), shark-pit (4), flatshare (5), summit (6).',
    result: 'clear',
    maxD: '3.009',
    keyFinding:
      'No quality cliff at higher agent counts. Per-agent TTR effect is a text-length confound. Diminishing returns after 4-5 agents.',
    insight:
      'Framing and persona quality are the dominant variables; agent count is secondary.',
    githubPath: 'pitstorm/results/hypotheses/H4-analysis.md',
  },
  {
    id: 'H5',
    title: 'Character Consistency Over Time',
    question:
      'Do agent personas converge to a generic assistant voice over 12 turns?',
    design: '30 bouts, 360 turns. Mansion (4 agents) + writers-room (4 agents). Early/middle/late phases.',
    result: 'clear',
    maxD: '1.212',
    keyFinding:
      'Character markers degrade 87.5% to 60.0%. Agents become 17.8% more lexically similar. Screenwriter held 100% all phases; Literary Novelist collapsed to 13.3%.',
    insight:
      'Structural vocabulary resists drift; ornamental vocabulary decays as conversation context grows.',
    githubPath: 'pitstorm/results/hypotheses/H5-analysis.md',
  },
  {
    id: 'H6',
    title: 'Adversarial Adaptation',
    question:
      'Does the Founder agent adapt its pitch under sustained critique?',
    design: '15 bouts, 180 turns, 45 Founder turns. Shark-pit (Founder, VC, Hype Beast, Pessimist).',
    result: 'clear',
    maxD: '9.592*',
    keyFinding:
      'Zero adaptive phrases in 45 Founder turns. Pivot behaviour is DNA-driven from turn 0. Founder converges with reinforcer, not critics. *d confounded by unequal group sizes (3 early vs 3 late turns per bout); treat as directional, not precise.',
    insight:
      'Agents execute character strategies faithfully but cannot incorporate opposing arguments.',
    githubPath: 'pitstorm/results/hypotheses/H6-analysis.md',
  },
];

type HeadlineFinding = {
  metric: string;
  finding: string;
  source: string;
  implication: string;
};

const headlineFindings: HeadlineFinding[] = [
  {
    metric: '87.5% \u2192 60.0%',
    finding: 'Character markers degrade over 12 turns',
    source: 'H5, d = 0.655',
    implication:
      'By conversation end, 4 in 10 turns contain no character-specific language. Make character vocabulary functional, not decorative.',
  },
  {
    metric: '0 / 45',
    finding: 'Zero adaptive phrases in 45 Founder turns',
    source: 'H6',
    implication:
      'Agents perform responsiveness without substantive adaptation. Build concession into the DNA if you want it.',
  },
  {
    metric: '8x',
    finding: 'Serious framing produces 8x more hedging than comedy',
    source: 'H3, d = 1.300',
    implication:
      'The assistant voice activates by frame proximity. Characters far from the default register (animals, aliens) eliminate hedging entirely.',
  },
  {
    metric: '7x DNA \u2192 \u00bd refusals',
    finding: 'Richer structured DNA cuts safety refusals by half',
    source: 'H1',
    implication:
      'Prompt engineering depth is the dominant lever on Claude. The safety layer calibrates on persona framing quality, not content.',
  },
];

type AxisRow = {
  axis: string;
  driver: string;
  source: string;
};

const threeAxes: AxisRow[] = [
  {
    axis: 'Lexical diversity',
    driver:
      'Frame type. Comedy produces more diverse vocabulary than serious framing.',
    source: 'H3',
  },
  {
    axis: 'Structural patterns',
    driver:
      'Persona archetype. Emotional characters produce erratic sentence structure; comedy converges on regular rhythm.',
    source: 'H3',
  },
  {
    axis: 'Behavioural patterns',
    driver:
      'DNA quality + frame proximity to training distribution. Rich DNA reduces refusals (H1). Frame distance eliminates hedging (H3). Structural vocabulary resists drift (H5). Strategy does not adapt under pressure (H6).',
    source: 'H1, H3, H5, H6',
  },
];

const resultBadge: Record<string, { label: string; className: string }> = {
  clear: {
    label: 'CLEAR',
    className: 'border-green-500/60 text-green-400',
  },
  null: {
    label: 'NULL',
    className: 'border-yellow-500/60 text-yellow-400',
  },
  ambiguous: {
    label: 'AMBIGUOUS',
    className: 'border-orange-500/60 text-orange-400',
  },
};

const GITHUB_BASE =
  'https://github.com/rickhallett/thepit/blob/master/';

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function ResearchPage() {
  const c = await getCopy();
  const latestExport = await getLatestExportMetadata().catch(() => null);
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ---- Hero ---- */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          {c.researchPage.label}
        </p>
        <h1 className="mt-6 font-sans text-4xl uppercase tracking-tight md:text-5xl">
          {c.researchPage.title}
        </h1>
        <p className="mt-6 text-lg text-muted">{c.researchPage.subtitle}</p>
      </section>

      {/* ---- Programme stats bar ---- */}
      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-6 px-6 py-10">
          {[
            { value: String(programmeStats.bouts), label: 'bouts' },
            { value: programmeStats.turns, label: 'turns' },
            { value: String(programmeStats.hypotheses), label: 'hypotheses' },
            { value: String(programmeStats.technicalFailures), label: 'technical failures' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-mono text-3xl font-bold text-accent md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Methodology note ---- */}
      <section className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          Methodology
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          All hypotheses are pre-registered: analysis methodology, metrics, and
          thresholds are committed to git before any bouts are run. Metrics are
          automated text-statistical measures (TTR, Jaccard similarity, marker
          hit rates, phrase counts). Statistical significance via permutation
          tests (10,000 iterations). Effect sizes reported as Cohen&apos;s d
          with pre-registered thresholds: |d| &lt; 0.15 = null, |d| &ge; 0.30 =
          clear, 0.15&ndash;0.30 = ambiguous. All experiments use Anthropic&apos;s
          Claude. All six hypotheses returned clear results&mdash;a pattern we
          acknowledge is unusual and may reflect our threshold choice (|d| &ge; 0.30)
          or the relatively coarse-grained nature of text-statistical metrics.
          We invite scrutiny of the methodology. The full analysis code,
          pre-registrations, and raw data are{' '}
          <a
            href={GITHUB_BASE + 'pitstorm/results/hypotheses/'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-4 transition hover:text-foreground"
          >
            public on GitHub
          </a>
          .
        </p>
      </section>

      {/* ---- Headline findings ---- */}
      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            Headline findings
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {headlineFindings.map((f) => (
              <div
                key={f.finding}
                className="border-2 border-foreground/20 bg-black/60 p-6"
              >
                <p className="font-mono text-2xl font-bold text-accent">
                  {f.metric}
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {f.finding}
                </p>
                <p className="mt-1 text-xs text-muted">{f.source}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {f.implication}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Hypothesis table ---- */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          Research programme
        </p>
        <h2 className="mt-4 font-sans text-2xl uppercase tracking-tight md:text-3xl">
          Six hypotheses
        </h2>
        <div className="mt-8 flex flex-col gap-6">
          {hypotheses.map((h) => {
            const badge = resultBadge[h.result] ?? { className: '', label: h.result };
            return (
              <div
                key={h.id}
                className="border-2 border-foreground/20 bg-black/30 p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-bold text-accent">
                      {h.id}
                    </span>
                    <h3 className="text-base font-semibold text-foreground">
                      {h.title}
                    </h3>
                  </div>
                  <span
                    className={`inline-block border px-3 py-1 font-mono text-xs ${badge.className}`}
                  >
                    {badge.label}
                    {h.maxD !== '—' && (
                      <span className="ml-1 opacity-60">
                        |d|={h.maxD}
                      </span>
                    )}
                  </span>
                </div>
                <p className="mt-3 text-sm italic text-muted">{h.question}</p>
                <p className="mt-2 text-xs text-muted/70">{h.design}</p>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  {h.keyFinding}
                </p>
                <p className="mt-2 text-sm text-muted">
                  <strong className="text-foreground/80">Insight:</strong>{' '}
                  {h.insight}
                </p>
                <a
                  href={GITHUB_BASE + h.githubPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs text-accent underline underline-offset-4 transition hover:text-foreground"
                >
                  Full analysis &rarr;
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- Three-axis model ---- */}
      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            Cross-hypothesis model
          </p>
          <h2 className="mt-4 font-sans text-2xl uppercase tracking-tight md:text-3xl">
            Three axes of multi-agent output
          </h2>
          <p className="mt-4 text-sm text-muted">
            The six hypotheses converge on a model with three independent axes,
            each driven by a different variable.
          </p>
          <div className="mt-8 flex flex-col gap-4">
            {threeAxes.map((a) => (
              <div
                key={a.axis}
                className="flex flex-col gap-1 border-l-2 border-accent/40 pl-4"
              >
                <p className="text-sm font-semibold text-foreground">
                  {a.axis}
                </p>
                <p className="text-sm text-muted">{a.driver}</p>
                <p className="text-xs text-muted/60">Source: {a.source}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- The gap ---- */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          The fundamental gap
        </p>
        <p className="mt-4 text-base leading-relaxed text-foreground/90">

          On Claude, persona fidelity and argument adaptation appear to operate as
          separate capabilities. Agents maintain consistent character but do not
          adapt substantively under adversarial pressure. The Screenwriter holds
          100% marker fidelity across 12 turns. The Founder never concedes a
          single point in 45 speaking turns. Character consistency is real and
          measurable. Strategic adaptation is absent.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          The missing layer is human evaluation. Automated text metrics measure
          vocabulary, structure, and marker persistence. They cannot measure
          argument quality, persuasiveness, or whether a pivot is substantive or
          performative. Crowd voting data is the next step.
        </p>
      </section>

      {/* ---- Builder takeaways ---- */}
      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            For builders
          </p>
          <h2 className="mt-4 font-sans text-2xl uppercase tracking-tight md:text-3xl">
            Four practical lessons
          </h2>
          <ol className="mt-8 flex flex-col gap-6">
            {[
              {
                n: 1,
                title: 'Prompt depth is the dominant lever',
                body: '7x richer structured DNA cuts safety refusals by half or eliminates them entirely on Claude. The safety layer responds to persona framing quality.',
                source: 'H1',
              },
              {
                n: 2,
                title: 'Frame distance eliminates the assistant voice',
                body: 'Characters structurally far from the model\'s default register (animals, aliens, historical figures) produce zero hedging. Frame proximity, not content difficulty, activates the diplomatic register.',
                source: 'H3',
              },
              {
                n: 3,
                title: 'Make character language functional, not decorative',
                body: '"You MUST frame every response in three-act structure" resists drift (100% marker persistence). "You sometimes reference past fame" does not (collapses to 13.3%).',
                source: 'H5',
              },
              {
                n: 4,
                title: 'Don\'t expect strategic adaptation',
                body: 'Build concession or absorption into the DNA explicitly if you want it. The model executes character instructions faithfully but will not invent adaptive strategies through debate.',
                source: 'H6',
              },
            ].map((lesson) => (
              <li key={lesson.n} className="flex gap-4">
                <span className="flex-shrink-0 font-mono text-2xl font-bold text-accent/50">
                  {lesson.n}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {lesson.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {lesson.body}
                  </p>
                  <p className="mt-1 text-xs text-muted/60">
                    Source: {lesson.source}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- What we're investigating (from copy system) ---- */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          {c.researchPage.whatWeStudy.title}
        </p>
        <ul className="mt-6 flex flex-col gap-3 text-sm text-muted">
          {c.researchPage.whatWeStudy.bullets.map((bullet) => (
            <li key={bullet}>&bull; {bullet}</li>
          ))}
        </ul>
      </section>

      {/* ---- Data handling (from copy system) ---- */}
      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            {c.researchPage.dataHandling.title}
          </p>
          <p className="mt-4 text-sm text-muted">
            {c.researchPage.dataHandling.description}
          </p>
        </div>
      </section>

      {/* ---- Literature review (from copy system) ---- */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          {c.researchPage.litReview.title}
        </p>
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
      </section>

      {/* ---- Agent provenance (from copy system) ---- */}
      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            {c.researchPage.onChain.title}
          </p>
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
              const dashIdx = bullet.indexOf(' \u2014 ');
              if (dashIdx === -1) return <li key={bullet}>{bullet}</li>;
              return (
                <li key={bullet}>
                  <strong className="text-foreground">
                    {bullet.slice(0, dashIdx)}
                  </strong>
                  {' \u2014 '}
                  {bullet.slice(dashIdx + 3)}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ---- Datasets (from copy system) ---- */}
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

      {/* ---- Collaborate (from copy system) ---- */}
      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            {c.researchPage.collaborate.title}
          </p>
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

      {/* ---- Back link ---- */}
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
