import { notFound } from 'next/navigation';
import Link from 'next/link';

import { getAgentDetail } from '@/lib/agent-detail';
import { buildAgentDetailHref, decodeAgentId } from '@/lib/agent-links';
import { buildAttestationUrl } from '@/lib/attestation-links';

export default async function AgentDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const resolved = await params;
  const agentId = decodeAgentId(resolved.id);
  const detail = await getAgentDetail(agentId, 4);

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
          {detail.ownerId && <div>Owner: {detail.ownerId}</div>}
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

        <section className="grid gap-2 text-xs text-muted">
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
