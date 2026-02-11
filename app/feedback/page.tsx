import Link from 'next/link';

import { FeatureRequestForm } from '@/components/feature-request-form';
import { FeatureRequestList } from '@/components/feature-request-list';

export const metadata = {
  title: 'Feedback — THE PIT',
  description:
    'Submit feature requests and vote on ideas to shape the future of The Pit.',
};

export default function FeedbackPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          Feedback
        </p>
        <h1 className="mt-6 font-sans text-4xl uppercase tracking-tight md:text-5xl">
          Shape The Pit
        </h1>
        <p className="mt-6 text-lg text-muted">
          Submit ideas, vote on what matters, and help us build what you
          actually want.
        </p>
      </section>

      {/* Submission form */}
      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            Submit a request
          </p>
          <h2 className="mt-4 font-sans text-2xl uppercase tracking-tight md:text-3xl">
            What should we build next?
          </h2>
          <div className="mt-8">
            <FeatureRequestForm />
          </div>
        </div>
      </section>

      {/* Public request list */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          Community requests
        </p>
        <h2 className="mt-4 font-sans text-2xl uppercase tracking-tight md:text-3xl">
          What the crowd wants
        </h2>
        <p className="mt-4 text-sm text-muted">
          Vote on requests to signal what matters most. Higher-voted requests
          get prioritised.
        </p>
        <div className="mt-8">
          <FeatureRequestList />
        </div>
      </section>

      {/* Footer nav */}
      <section className="mx-auto max-w-4xl px-6 py-12 text-center">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.3em] text-muted transition hover:text-accent"
        >
          &larr; Back to The Pit
        </Link>
      </section>
    </main>
  );
}
