import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';

import { getCopy } from '@/lib/copy';
import { getAgentDetail } from '@/lib/agent-detail';
import { buildAgentDetailHref, decodeAgentId } from '@/lib/agent-links';
import { buildAttestationUrl } from '@/lib/attestation-links';
import { getRemixStats } from '@/lib/remix-events';
import { MICRO_PER_CREDIT } from '@/lib/credits';
import { CloneAgentButton } from '@/components/clone-agent-button';
import { DnaFingerprint } from '@/components/dna-fingerprint';
import { isAdmin } from '@/lib/admin';
import { archiveAgent, restoreAgent } from '@/app/actions';
import { getUserDisplayName } from '@/lib/users';

export default async function AgentDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const c = await getCopy();
  const resolved = await params;
  const agentId = decodeAgentId(resolved.id);
  const [detail, { userId }, remixStats] = await Promise.all([
    getAgentDetail(agentId, 4),
    auth(),
    getRemixStats(agentId),
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
            {c.agentDetail.dnaTitle}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <DnaFingerprint hash={detail.manifestHash ?? detail.promptHash ?? ''} size={48} />
            <h1 className="font-sans text-3xl uppercase tracking-tight md:text-4xl">
              {detail.name}
            </h1>
          </div>
          {detail.presetName && (
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-muted">
              {detail.presetName}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <CloneAgentButton sourceAgentId={detail.id} label={c.agentDetail.cloneRemix} />
            {userIsAdmin && !detail.archived && (
              <form action={archiveAgent.bind(null, detail.id)}>
                <button
                  type="submit"
                  className="border-2 border-red-600/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-red-500 transition hover:border-red-500 hover:bg-red-500/10"
                >
                  {c.agentDetail.archiveAgent}
                </button>
              </form>
            )}
            {userIsAdmin && detail.archived && (
              <form action={restoreAgent.bind(null, detail.id)}>
                <button
                  type="submit"
                  className="border-2 border-green-600/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-green-500 transition hover:border-green-500 hover:bg-green-500/10"
                >
                  {c.agentDetail.restoreAgent}
                </button>
              </form>
            )}
          </div>
          {userIsAdmin && detail.archived && (
            <p className="mt-2 text-xs uppercase tracking-[0.25em] text-red-500">
              {c.agentDetail.archivedNotice}
            </p>
          )}
        </header>

        <section className="grid gap-3 text-xs uppercase tracking-[0.25em] text-muted">
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full border border-foreground/40 px-3 py-1">
              {c.agentDetail.fields.tier} {detail.tier}
            </span>
            <span className="rounded-full border border-foreground/40 px-3 py-1">
              {c.agentDetail.fields.length} {detail.responseLength}
            </span>
            <span className="rounded-full border border-foreground/40 px-3 py-1">
              {c.agentDetail.fields.format} {detail.responseFormat}
            </span>
            {detail.createdAt && (
              <span className="rounded-full border border-foreground/40 px-3 py-1">
                {c.agentDetail.fields.created} {new Date(detail.createdAt).toLocaleString()}
              </span>
            )}
          </div>
          {detail.ownerId && (
            <div>
              {c.agentDetail.fields.owner}{' '}
              {await getUserDisplayName(detail.ownerId)}
            </div>
          )}
        </section>

        {detail.lineage.length > 0 && (
          <section>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">
              {c.agentDetail.lineage}
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

        {remixStats.remixCount > 0 && (
          <section className="grid gap-2 text-xs uppercase tracking-[0.25em] text-muted">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">
              {c.agentDetail.remixImpact}
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-foreground/40 px-3 py-1">
                {c.agentDetail.remixCount.replace('{n}', String(remixStats.remixCount))}
              </span>
              {remixStats.totalRewardsMicro > 0 && (
                <span className="rounded-full border border-accent/60 px-3 py-1 text-accent">
                  {c.agentDetail.creditsEarned.replace('{n}', (remixStats.totalRewardsMicro / MICRO_PER_CREDIT).toFixed(1))}
                </span>
              )}
            </div>
          </section>
        )}

        <section>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">
            {c.agentDetail.promptDna}
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
              {c.agentDetail.structuredDna}
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
            {c.agentDetail.onChainIdentity.title}
          </p>
          <p className="text-sm text-muted">
            {c.agentDetail.onChainIdentity.description}
          </p>
          <div className="flex items-center gap-2">
            {detail.promptHash && <DnaFingerprint hash={detail.promptHash} size={16} />}
            {c.agentDetail.onChainIdentity.promptHash}{' '}
            <span className="text-foreground">
              {detail.promptHash ?? c.agentDetail.onChainIdentity.pending}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {detail.manifestHash && <DnaFingerprint hash={detail.manifestHash} size={16} />}
            {c.agentDetail.onChainIdentity.manifestHash}{' '}
            <span className="text-foreground">
              {detail.manifestHash ?? c.agentDetail.onChainIdentity.pending}
            </span>
          </div>
          <div>
            {c.agentDetail.onChainIdentity.attestation}{' '}
            {attestationUrl ? (
              <a
                href={attestationUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                {c.agentDetail.onChainIdentity.viewOnchain}
              </a>
            ) : (
              <span className="text-foreground">{c.agentDetail.onChainIdentity.pending}</span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
