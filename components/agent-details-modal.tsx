'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { cn } from '@/lib/cn';
import { useCopy } from '@/lib/copy-client';
import { buildAgentDetailHref } from '@/lib/agent-links';
import { buildAttestationUrl } from '@/lib/attestation-links';
import { CloneAgentButton } from '@/components/clone-agent-button';
import { DnaFingerprint } from '@/components/dna-fingerprint';

export type AgentDetails = {
  id: string;
  name: string;
  presetName?: string | null;
  tier: 'free' | 'premium' | 'custom';
  systemPrompt: string;
  createdAt?: string | null;
  ownerId?: string | null;
  parentId?: string | null;
  promptHash?: string | null;
  manifestHash?: string | null;
  attestationUid?: string | null;
  attestationTxHash?: string | null;
  responseLength?: string | null;
  responseFormat?: string | null;
  lineage?: { id: string; name: string }[];
};

export function AgentDetailsModal({
  agent,
  onClose,
  className,
}: {
  agent: AgentDetails | null;
  onClose: () => void;
  className?: string;
}) {
  const c = useCopy();

  useEffect(() => {
    if (!agent) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [agent, onClose]);

  if (!agent) return null;

  const attestationUrl = agent.attestationUid
    ? buildAttestationUrl(agent.attestationUid)
    : null;

  return (
    <div className={cn('fixed inset-0 z-50', className)}>
      <div
        className="absolute inset-0 bg-black/80"
        role="presentation"
        onClick={onClose}
      />
      <div className="absolute left-1/2 top-1/2 w-[min(720px,92vw)] -translate-x-1/2 -translate-y-1/2 border-2 border-foreground/70 bg-black/95 p-6 shadow-[10px_10px_0_rgba(255,255,255,0.2)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted">
              {c.agentDetail.dnaTitle}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <DnaFingerprint hash={agent.manifestHash ?? agent.promptHash ?? ''} size={40} />
              <h2 className="text-2xl uppercase tracking-tight">
                {agent.name}
              </h2>
            </div>
            {agent.presetName && (
              <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted">
                {agent.presetName}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-foreground/60 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted transition hover:border-accent hover:text-accent"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-3 text-xs uppercase tracking-[0.25em] text-muted">
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full border border-foreground/40 px-3 py-1">
              {c.agentDetail.fields.tier} {agent.tier}
            </span>
            {agent.responseLength && (
              <span className="rounded-full border border-foreground/40 px-3 py-1">
                {c.agentDetail.fields.length} {agent.responseLength}
              </span>
            )}
            {agent.responseFormat && (
              <span className="rounded-full border border-foreground/40 px-3 py-1">
                {c.agentDetail.fields.format} {agent.responseFormat}
              </span>
            )}
            {agent.createdAt && (
              <span className="rounded-full border border-foreground/40 px-3 py-1">
                {c.agentDetail.fields.created} {new Date(agent.createdAt).toLocaleString()}
              </span>
            )}
          </div>
          {agent.ownerId && <div>{c.agentDetail.fields.owner} {agent.ownerId}</div>}
        </div>

        {agent.lineage && agent.lineage.length > 0 && (
          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">
              {c.agentDetail.lineage}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.25em]">
              {agent.lineage.map((ancestor) => (
                <Link
                  key={ancestor.id}
                  href={buildAgentDetailHref(ancestor.id)}
                  className="rounded-full border border-foreground/40 px-3 py-1 transition hover:border-accent hover:text-accent"
                >
                  {ancestor.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">
            {c.agentDetail.promptDna}
          </p>
          <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap border-2 border-foreground/60 bg-black/70 p-4 text-sm text-foreground/90">
            {agent.systemPrompt}
          </pre>
        </div>

        <div className="mt-6 grid gap-2 text-xs text-muted">
          <div className="flex items-center gap-2">
            {agent.promptHash && <DnaFingerprint hash={agent.promptHash} size={16} />}
            {c.agentDetail.onChainIdentity.promptHash}{' '}
            <span className="text-foreground">
              {agent.promptHash ?? c.agentDetail.onChainIdentity.pending}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {agent.manifestHash && <DnaFingerprint hash={agent.manifestHash} size={16} />}
            {c.agentDetail.onChainIdentity.manifestHash}{' '}
            <span className="text-foreground">
              {agent.manifestHash ?? c.agentDetail.onChainIdentity.pending}
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
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em]">
          <Link
            href={buildAgentDetailHref(agent.id)}
            className="rounded-full border-2 border-foreground/60 px-3 py-2 transition hover:border-accent hover:text-accent"
          >
            View full DNA
          </Link>
          <CloneAgentButton sourceAgentId={agent.id} onClone={onClose} />
        </div>
      </div>
    </div>
  );
}
