import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';

import { getAgentDetail } from '@/lib/agent-detail';
import { buildAgentDetailHref, decodeAgentId } from '@/lib/agent-links';
import { buildAttestationUrl } from '@/lib/attestation-links';
import { CloneAgentButton } from '@/components/clone-agent-button';
import { isAdmin } from '@/lib/admin';
import { archiveAgent, restoreAgent } from '@/app/actions';
import { getUserDisplayName } from '@/lib/users';

export default async function AgentDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const resolved = await params;
  const agentId = decodeAgentId(resolved.id);
  const [detail, { userId }] = await Promise.all([
    getAgentDetail(agentId, 4),
    auth(),
  ]);
  const userIsAdmin = isAdmin(userId ?? null);

  if (!detail) {
    notFound();
  }

  const attestationUrl = detail.attestationUid
    ? buildAttestationUrl(detail.attestationUid)
    : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
        <header className="border-b-2 border-foreground/70 pb-6">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            Agent DNA
          </p>
          <h1 className="mt-3 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            {detail.name}
          </h1>
          {detail.presetName && (
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-muted">
              {detail.presetName}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <CloneAgentButton sourceAgentId={detail.id} />
            {userIsAdmin && !detail.archived && (
              <form action={archiveAgent.bind(null, detail.id)}>
                <button
                  type="submit"
                  className="border-2 border-red-600/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-red-500 transition hover:border-red-500 hover:bg-red-500/10"
                >
                  Archive agent
                </button>
              </form>
            )}
            {userIsAdmin && detail.archived && (
              <form action={restoreAgent.bind(null, detail.id)}>
                <button
                  type="submit"
                  className="border-2 border-green-600/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-green-500 transition hover:border-green-500 hover:bg-green-500/10"
                >
                  Restore agent
                </button>
              </form>
            )}
          </div>
          {userIsAdmin && detail.archived && (
            <p className="mt-2 text-xs uppercase tracking-[0.25em] text-red-500">
              This agent is archived
            </p>
          )}
        </header>

        <section className="grid gap-3 text-xs uppercase tracking-[0.25em] text-muted">
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full border border-foreground/40 px-3 py-1">
              Tier: {detail.tier}
            </span>
            <span className="rounded-full border border-foreground/40 px-3 py-1">
              Length: {detail.responseLength}
            </span>
            <span className="rounded-full border border-foreground/40 px-3 py-1">
              Format: {detail.responseFormat}
            </span>
            {detail.createdAt && (
              <span className="rounded-full border border-foreground/40 px-3 py-1">
                Created: {new Date(detail.createdAt).toLocaleString()}
              </span>
            )}
          </div>
          {detail.ownerId && (
            <div>
              Owner:{' '}
              {await getUserDisplayName(detail.ownerId)}
            </div>
          )}
        </section>

        {detail.lineage.length > 0 && (
          <section>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">
              Lineage
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.25em]">
              {detail.lineage.map((ancestor) => (
                <Link
                  key={ancestor.id}
                  href={buildAgentDetailHref(ancestor.id)}
                  className="rounded-full border border-foreground/40 px-3 py-1 transition hover:border-accent hover:text-accent"
                >
                  {ancestor.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">
            Prompt DNA
          </p>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap border-2 border-foreground/60 bg-black/70 p-4 text-sm text-foreground/90">
            {detail.systemPrompt}
          </pre>
        </section>

        {(detail.archetype ||
          detail.tone ||
          (detail.quirks && detail.quirks.length > 0) ||
          detail.speechPattern ||
          detail.openingMove ||
          detail.signatureMove ||
          detail.weakness ||
          detail.goal ||
          detail.fears ||
          detail.customInstructions) && (
          <section className="grid gap-3 text-xs uppercase tracking-[0.25em] text-muted">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">
              Structured DNA
            </p>
            <div className="grid gap-2 text-sm normal-case text-foreground/90">
              {detail.archetype && <div>Archetype: {detail.archetype}</div>}
              {detail.tone && <div>Tone: {detail.tone}</div>}
              {detail.quirks && detail.quirks.length > 0 && (
                <div>Quirks: {detail.quirks.join(', ')}</div>
              )}
              {detail.speechPattern && (
                <div>Speech pattern: {detail.speechPattern}</div>
              )}
              {detail.openingMove && (
                <div>Opening move: {detail.openingMove}</div>
              )}
              {detail.signatureMove && (
                <div>Signature move: {detail.signatureMove}</div>
              )}
              {detail.weakness && <div>Weakness: {detail.weakness}</div>}
              {detail.goal && <div>Goal: {detail.goal}</div>}
              {detail.fears && <div>Fears: {detail.fears}</div>}
              {detail.customInstructions && (
                <div>Custom instructions: {detail.customInstructions}</div>
              )}
            </div>
          </section>
        )}

        <section className="grid gap-3 text-xs text-muted">
          <p className="text-xs uppercase tracking-[0.3em] text-accent">
            On-chain Identity
          </p>
          <p className="text-sm text-muted">
            Every agent&apos;s DNA is hashed and can be attested on-chain via the
            Ethereum Attestation Service on Base L2, creating an immutable record
            of identity and lineage.
          </p>
          <div>
            Prompt hash:{' '}
            <span className="text-foreground">
              {detail.promptHash ?? 'Pending'}
            </span>
          </div>
          <div>
            Manifest hash:{' '}
            <span className="text-foreground">
              {detail.manifestHash ?? 'Pending'}
            </span>
          </div>
          <div>
            Attestation:{' '}
            {attestationUrl ? (
              <a
                href={attestationUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                View onchain
              </a>
            ) : (
              <span className="text-foreground">Pending</span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
