import { PresetCard } from '@/components/preset-card';
import { PRESETS } from '@/lib/presets';

import { createBout } from './actions';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-12">
        <header className="flex flex-col gap-5 border-b-2 border-foreground/70 pb-8">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            THE PIT
          </p>
          <h1 className="font-sans text-4xl uppercase tracking-tight md:text-5xl">
            AI Battle Arena
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            Pick a preset. The arena will spin up a round-robin debate and stream
            each agent in real time. No poker math, no calculators, just chaos.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              action={createBout.bind(null, preset.id)}
            />
          ))}
        </section>

        <footer className="text-xs uppercase tracking-[0.3em] text-muted">
          Zero monte carlo. Zero equity. Pure spectacle.
        </footer>
      </div>
    </main>
  );
}
