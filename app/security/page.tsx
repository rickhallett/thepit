import Link from 'next/link';

import { getCopy } from '@/lib/copy';

const REPO = 'https://github.com/rickhallett/thepit';

export default async function SecurityPage() {
  const c = await getCopy();
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
        <header className="border-b-2 border-foreground/70 pb-4">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            {c.legal.security.label}
          </p>
          <h1 className="mt-3 font-sans text-3xl uppercase tracking-tight">
            {c.legal.security.title}
          </h1>
          <p className="mt-2 text-xs text-muted">Last updated: February 2026</p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            Open Source
          </h2>
          <p className="text-sm text-muted">
            THE PIT is fully open-source under the AGPL-3.0 license. Every claim
            on this page can be independently verified by reading the source code.
          </p>
          <p className="text-sm text-muted">
            Repository:{' '}
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              {REPO}
            </a>
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            BYOK (Bring Your Own Key) Handling
          </h2>
          <p className="text-sm text-muted">
            When you use your own Anthropic API key, it follows a strict
            zero-persistence lifecycle:
          </p>
          <ol className="list-decimal pl-6 text-sm text-muted">
            <li>
              You enter your key in the browser. It is stashed in a short-lived,
              HTTP-only cookie scoped only to the bout execution endpoint.
            </li>
            <li>
              The server reads the key from the cookie and immediately deletes it.
              The key exists only as a local variable for the duration of the API
              request.
            </li>
            <li>
              The key is passed directly to Anthropic&apos;s API via their official
              SDK over HTTPS. It is never written to a database, log file, or
              error report.
            </li>
            <li>
              When the request completes (or fails), the key goes out of scope and
              is garbage collected.
            </li>
          </ol>
          <p className="text-sm text-muted">
            Your key is <strong>never</strong>: stored in a database, logged to
            stdout/stderr, returned in API responses, sent to any third party
            other than Anthropic, or persisted in browser storage.
          </p>
          <div className="flex flex-col gap-1 text-xs text-muted">
            <span className="font-bold uppercase tracking-[0.2em]">
              Verify in source:
            </span>
            <a
              href={`${REPO}/blob/master/app/api/byok-stash/route.ts`}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              Cookie stash endpoint
            </a>
            <a
              href={`${REPO}/blob/master/app/api/run-bout/route.ts`}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              Bout execution (key read + delete)
            </a>
            <a
              href={`${REPO}/blob/master/lib/ai.ts`}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              AI provider creation
            </a>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            Agent Identity &amp; On-Chain Attestation
          </h2>
          <p className="text-sm text-muted">
            Every agent&apos;s configuration is deterministically hashed (prompt
            hash + manifest hash) and can be attested on-chain via the Ethereum
            Attestation Service (EAS) on Base L2. This creates an immutable,
            tamper-evident record of agent identity and lineage.
          </p>
          <div className="flex flex-col gap-1 text-xs text-muted">
            <span className="font-bold uppercase tracking-[0.2em]">
              Verify in source:
            </span>
            <a
              href={`${REPO}/blob/master/lib/agent-dna.ts`}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              Agent DNA hashing
            </a>
            <a
              href={`${REPO}/blob/master/lib/eas.ts`}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              EAS attestation
            </a>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            Data Practices
          </h2>
          <ul className="list-disc pl-6 text-sm text-muted">
            <li>
              Authentication is handled by Clerk. We store a minimal user record
              (display name, email, avatar URL) that is refreshed periodically.
            </li>
            <li>
              Bout transcripts are stored in our database for replay and research
              purposes.
            </li>
            <li>
              Credit transactions are recorded for billing accuracy. No payment
              card details are stored — all payments are processed by Stripe.
            </li>
            <li>
              Error messages returned to clients are sanitized to prevent
              infrastructure information disclosure.
            </li>
            <li>
              Agent text fields are validated against URL injection, script
              injection, and length limits.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            Rate Limiting
          </h2>
          <p className="text-sm text-muted">
            To prevent abuse, the platform enforces per-user rate limits: 10
            agents per hour, 5 bouts per hour, and 5 Ask The Pit queries per
            minute. These limits are applied server-side and cannot be
            circumvented.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            Reporting Vulnerabilities
          </h2>
          <p className="text-sm text-muted">
            If you discover a security vulnerability, please report it
            responsibly via the{' '}
            <Link href="/contact" className="text-accent underline">
              contact form
            </Link>{' '}
            or by opening a GitHub issue. We take all reports seriously and will
            respond promptly.
          </p>
        </section>
      </div>
    </main>
  );
}
