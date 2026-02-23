import Link from 'next/link';

import { FeatureRequestForm } from '@/components/feature-request-form';
import { FeatureRequestList } from '@/components/feature-request-list';
import { getCopy } from '@/lib/copy';

export const metadata = {
  title: 'Feedback — The Pit',
  description:
    'Submit feature requests and vote on ideas to shape the future of The Pit.',
};

export default async function FeedbackPage() {
  const c = await getCopy();
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          {c.feedback.label}
        </p>
        <h1 className="mt-6 font-sans text-4xl uppercase tracking-tight md:text-5xl">
          {c.feedback.title}
        </h1>
        <p className="mt-6 text-lg text-muted">
          {c.feedback.description}
        </p>
      </section>

      {/* Submission form */}
      <section className="border-y-2 border-foreground/70 bg-black/40">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            {c.feedback.submitSection.title}
          </p>
          <h2 className="mt-4 font-sans text-2xl uppercase tracking-tight md:text-3xl">
            {c.feedback.submitSection.placeholder}
          </h2>
          <div className="mt-8">
            <FeatureRequestForm />
          </div>
        </div>
      </section>

      {/* Public request list */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          {c.feedback.communitySection.title}
        </p>
        <h2 className="mt-4 font-sans text-2xl uppercase tracking-tight md:text-3xl">
          {c.feedback.communitySection.subtitle}
        </h2>
        <p className="mt-4 text-sm text-muted">
          {c.feedback.communitySection.description}
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
          {c.feedback.backToThePit}
        </Link>
      </section>
    </main>
  );
}
