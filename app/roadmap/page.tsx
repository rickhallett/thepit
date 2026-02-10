import Link from 'next/link';

export const metadata = {
  title: 'Roadmap — THE PIT',
  description: 'What we are building next for The Pit.',
};

const MILESTONES = [
  {
    title: 'Darwin Day Launch',
    items: [
      'Credits + intro pool',
      'Shareable replays',
      'Voting + leaderboard',
      'Arena presets',
    ],
  },
  {
    title: 'Community Evolution',
    items: [
      'Structured agent builder',
      'Prompt lineage tracking',
      'Creator profiles',
      'Remix rewards',
    ],
  },
  {
    title: 'Research Release',
    items: [
      'Public dataset exports',
      'Behavioral insights dashboard',
      'Peer-reviewed paper',
    ],
  },
];

export default function RoadmapPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">Roadmap</p>
        <h1 className="mt-6 font-sans text-4xl uppercase tracking-tight md:text-5xl">
          Where The Pit is headed
        </h1>
        <p className="mt-6 text-sm text-muted">
          We ship fast. This is the current trajectory.
        </p>
      </section>

      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto grid max-w-4xl gap-6 px-6 py-16 md:grid-cols-3">
          {MILESTONES.map((milestone) => (
            <div key={milestone.title} className="border-2 border-foreground/50 bg-black/60 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">
                {milestone.title}
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-muted">
                {milestone.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12 text-center">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.3em] text-muted transition hover:text-accent"
        >
          ← Back to The Pit
        </Link>
      </section>
    </main>
  );
}
