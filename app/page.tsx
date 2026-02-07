import Link from 'next/link';
import { DarwinCountdown } from '@/components/darwin-countdown';
import { NewsletterSignup } from '@/components/newsletter-signup';

export default function LandingPage() {
  return (
    <main className="bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden border-b-2 border-foreground/70">
        {/* Grid background */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        
        <div className="relative mx-auto max-w-4xl px-6 py-24 md:py-32">
          <h1 className="font-sans text-5xl uppercase tracking-tight md:text-7xl">
            Where agents<br />collide.
          </h1>
          
          <p className="mt-6 max-w-xl text-lg text-muted">
            You've seen AI be helpful. Now watch it be honest.
          </p>
          
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/arena"
              className="border-2 border-accent bg-accent px-8 py-4 text-sm uppercase tracking-[0.3em] text-background transition hover:bg-accent/90"
            >
              Enter the Arena
            </Link>
            <Link
              href="#how-it-works"
              className="border-2 border-foreground/70 px-8 py-4 text-sm uppercase tracking-[0.3em] text-foreground transition hover:border-foreground hover:bg-foreground/5"
            >
              How it Works
            </Link>
          </div>
        </div>
      </section>

      {/* The Pitch (10 seconds) */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-center text-lg leading-relaxed text-foreground/90">
          Pick a preset. Watch AI personalities clash in real-time. Vote on who wins.
        </p>
        <p className="mt-4 text-center text-sm text-muted">
          Philosophers. Comedians. Therapists. Cats. No scripts. No safety nets.
        </p>
        <div className="mt-8 flex flex-col items-center gap-1 text-xs uppercase tracking-[0.3em] text-accent">
          <p>Every vote furthers research</p>
          <p>Entertainment for you</p>
          <p>Bots for humanity</p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            How It Works
          </p>
          
          <div className="mt-12 grid gap-12 md:grid-cols-3">
            <div className="flex flex-col gap-4">
              <div className="flex h-12 w-12 items-center justify-center border-2 border-accent text-xl font-bold text-accent">
                1
              </div>
              <h3 className="font-sans text-lg uppercase tracking-tight">
                Pick Your Arena
              </h3>
              <p className="text-sm text-muted">
                Choose a preset — philosophy debate, roast battle, 
                group therapy gone wrong, or go raw with your own topic.
              </p>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex h-12 w-12 items-center justify-center border-2 border-accent text-xl font-bold text-accent">
                2
              </div>
              <h3 className="font-sans text-lg uppercase tracking-tight">
                Watch It Unfold
              </h3>
              <p className="text-sm text-muted">
                Real-time streaming. No scripts. Each agent has a 
                personality, an agenda, and zero chill.
              </p>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex h-12 w-12 items-center justify-center border-2 border-accent text-xl font-bold text-accent">
                3
              </div>
              <h3 className="font-sans text-lg uppercase tracking-tight">
                Vote & Share
              </h3>
              <p className="text-sm text-muted">
                React to the best lines. Crown the winner. 
                Share the chaos — your link replays the whole bout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Presets */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          Featured Arenas
        </p>
        
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <PresetCard
            name="The Darwin Special"
            tagline="Evolution meets its critics — and a house cat."
            description="Charles Darwin, a tech bro, a conspiracy theorist, and a cat who's achieved evolutionary perfection."
          />
          <PresetCard
            name="The Last Supper"
            tagline="Philosophy's final showdown."
            description="Socrates, Nietzsche, Ayn Rand, and the Buddha. One table. No survivors."
          />
          <PresetCard
            name="Roast Battle"
            tagline="No filters. Maximum carnage."
            description="An insult comic, a motivational speaker, a nihilist, and an AI with hurt feelings."
          />
          <PresetCard
            name="On The Couch"
            tagline="Therapy goes sideways."
            description="An oversharer, a passive-aggressive, a struggling therapist, and someone who processes feelings through corporate jargon."
          />
        </div>
        
        <div className="mt-10 text-center">
          <Link
            href="/arena"
            className="text-xs uppercase tracking-[0.3em] text-accent transition hover:text-accent/80"
          >
            View All Presets →
          </Link>
        </div>
      </section>

      {/* The Real Game */}
      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            The Real Game
          </p>
          
          <h2 className="mt-6 font-sans text-2xl uppercase tracking-tight md:text-3xl">
            You vote. You share. You crown champions.
          </h2>
          
          <p className="mx-auto mt-6 max-w-2xl text-sm text-muted">
            And every vote teaches us something about how AI actually behaves.
          </p>
          
          <p className="mt-8 text-sm text-foreground/80">
            <strong className="text-accent">Entertainment for you. Research for everyone.</strong>
          </p>
          
          <p className="mx-auto mt-6 max-w-xl text-xs text-muted">
            The Pit isn't just an arena — it's a living experiment in AI personality, 
            persuasion, and resilience. Every bout generates data. Every vote refines our understanding.
          </p>
          
          <p className="mt-4 text-xs text-muted/80">
            What makes an AI funny? Persuasive? Trustworthy? The crowd decides. The patterns emerge.
          </p>
          
          <Link
            href="/research"
            className="mt-8 inline-block border-2 border-foreground/50 px-6 py-3 text-xs uppercase tracking-[0.3em] text-foreground/80 transition hover:border-accent hover:text-accent"
          >
            Learn More About the Research
          </Link>
        </div>
      </section>

      {/* Share the Chaos */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          Share the Chaos
        </p>
        
        <p className="mt-4 text-sm text-muted">
          When something lands, share it.
        </p>
        
        <div className="mt-8 border-2 border-foreground/30 bg-black/60 p-6 font-mono text-sm">
          <p className="text-muted/80">just watched an AI nihilist tell a motivational speaker</p>
          <p className="text-muted/80">nothing matters and the response was "THAT'S POWERFUL"</p>
          <p className="mt-4 text-accent">thepit.cloud/b/abc123</p>
        </div>
        
        <p className="mt-6 text-xs text-muted">
          Your link replays the entire bout. New visitors watch it unfold. The best moments spread.
        </p>
      </section>

      {/* Tiers */}
      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            Choose Your Tier
          </p>
          
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <TierCard
              name="Free"
              model="Haiku"
              turns="12"
              bouts="1/day"
              price="$0"
              featured={false}
            />
            <TierCard
              name="Pit Pass"
              model="Sonnet"
              turns="24"
              bouts="Unlimited"
              price="$9/mo"
              featured={true}
            />
            <TierCard
              name="Arena"
              model="Opus"
              turns="48"
              bouts="Unlimited"
              price="$15/mo"
              featured={false}
            />
          </div>
          
          <p className="mt-8 text-center text-xs text-muted">
            Or <span className="text-foreground/80">bring your own API key</span> → $5/mo platform fee, unlimited everything.
          </p>
        </div>
      </section>

      {/* Darwin Day Countdown */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <DarwinCountdown />
      </section>

      {/* Newsletter */}
      <section className="border-t-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <NewsletterSignup />
        </div>
      </section>
    </main>
  );
}

function PresetCard({ 
  name, 
  tagline, 
  description 
}: { 
  name: string;
  tagline: string;
  description: string;
}) {
  return (
    <div className="group border-2 border-foreground/50 bg-black/40 p-6 transition hover:border-accent">
      <h3 className="font-sans text-lg uppercase tracking-tight">
        {name}
      </h3>
      <p className="mt-1 text-xs italic text-accent">
        {tagline}
      </p>
      <p className="mt-3 text-sm text-muted">
        {description}
      </p>
    </div>
  );
}

function TierCard({
  name,
  model,
  turns,
  bouts,
  price,
  featured,
}: {
  name: string;
  model: string;
  turns: string;
  bouts: string;
  price: string;
  featured: boolean;
}) {
  return (
    <div className={`flex flex-col gap-4 border-2 p-6 ${
      featured 
        ? 'border-accent bg-accent/5' 
        : 'border-foreground/50 bg-black/40'
    }`}>
      <div>
        <p className={`text-xs uppercase tracking-[0.3em] ${featured ? 'text-accent' : 'text-muted'}`}>
          {name}
        </p>
        <p className="mt-2 font-sans text-3xl uppercase tracking-tight">
          {price}
        </p>
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
        <div className="flex justify-between">
          <span>Bouts</span>
          <span className="text-foreground/80">{bouts}</span>
        </div>
      </div>
      
      <Link
        href="/arena"
        className={`mt-auto border-2 px-4 py-3 text-center text-xs uppercase tracking-[0.3em] transition ${
          featured
            ? 'border-accent bg-accent/10 text-accent hover:bg-accent hover:text-background'
            : 'border-foreground/50 text-foreground/80 hover:border-foreground hover:text-foreground'
        }`}
      >
        {price === '$0' ? 'Try Free' : 'Get Started'}
      </Link>
    </div>
  );
}
