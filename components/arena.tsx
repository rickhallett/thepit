'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';
import { cn } from '@/lib/cn';
import type { Preset } from '@/lib/presets';
import { useBout } from '@/lib/use-bout';
import {
  initScrollDepthTracking,
  initActiveTimeTracking,
  trackBoutEngagement,
} from '@/lib/engagement';
import { useBoutReactions } from '@/lib/use-bout-reactions';
import { useBoutVoting } from '@/lib/use-bout-voting';
import { useBoutSharing } from '@/lib/use-bout-sharing';
import { useCopy } from '@/lib/copy-client';
import type { TranscriptEntry } from '@/db/schema';
import type { ReactionCountMap } from '@/lib/reactions';
import type { WinnerVoteCounts } from '@/lib/winner-votes';
import { PitButton } from '@/components/ui/button';
import { PitBadge } from '@/components/ui/badge';
import { RateLimitUpgradePrompt } from '@/components/rate-limit-upgrade-prompt';
import type { ErrorDetail } from '@/lib/use-bout';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BoutHeader({
  preset,
  status,
  estimatedCredits,
  copied,
  onCopyTranscript,
}: {
  preset: Preset;
  status: string;
  estimatedCredits?: string | null;
  copied: boolean;
  onCopyTranscript: () => void;
}) {
  const c = useCopy();
  const statusLabels: Record<string, string> = c.arenaComponent.statusLabels;
  const statusVariant =
    status === 'streaming'
      ? 'accent'
      : status === 'error'
        ? 'danger'
        : 'default';

  return (
    <header className="flex flex-col gap-4 border-b-2 border-foreground/70 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            {c.arenaComponent.header.badge}
          </p>
          <h1 className="mt-3 font-sans text-3xl uppercase tracking-tight md:text-4xl">
            {preset.name}
          </h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 text-xs uppercase tracking-[0.3em]">
          <PitBadge variant={statusVariant}>
            {statusLabels[status] ?? status}
          </PitBadge>
          {estimatedCredits && (
            <PitBadge variant="muted">
              {c.arenaComponent.header.estCredits.replace('{credits}', String(estimatedCredits))}
            </PitBadge>
          )}
          {status === 'done' && (
            <PitButton variant="primary" size="md" onClick={onCopyTranscript}>
              {copied ? c.arenaComponent.header.copied : c.arenaComponent.header.share}
            </PitButton>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-muted">
        {preset.agents.map((agent) => (
          <span
            key={agent.id}
            className="rounded-full border-2 px-3 py-1"
            style={{ borderColor: agent.color, color: agent.color }}
          >
            {agent.name}
          </span>
        ))}
      </div>
    </header>
  );
}

function BoutError({
  errorDetail,
}: {
  errorDetail?: ErrorDetail | null;
}) {
  const c = useCopy();

  // Rate-limited with structured metadata → contextual upgrade prompt.
  if (errorDetail?.code === 429 && errorDetail.rateLimit) {
    return (
      <RateLimitUpgradePrompt
        rateLimit={errorDetail.rateLimit}
        errorMessage={errorDetail.message}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 border-2 border-red-400/60 p-8 text-center">
      <p className="text-sm text-red-400">
        {errorDetail?.message ?? c.arenaComponent.error.defaultMessage}
      </p>
      {errorDetail?.code === 401 && (
        <Link
          href="/sign-in?redirect_url=/arena"
          className="rounded-full border-2 border-accent/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-accent transition hover:border-accent hover:bg-accent/10"
        >
          {c.arenaComponent.error.signIn}
        </Link>
      )}
      {errorDetail?.code === 402 && (
        <Link
          href="/arena#credits"
          className="rounded-full border-2 border-accent/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-accent transition hover:border-accent hover:bg-accent/10"
        >
          {c.arenaComponent.error.getCredits}
        </Link>
      )}
      <PitButton
        variant="secondary"
        size="lg"
        onClick={() => window.location.assign('/arena')}
      >
        {c.arenaComponent.error.tryAgain}
      </PitButton>
    </div>
  );
}

function MessageCard({
  message,
  alignment,
  isActiveStreaming,
  reactions,
  userReacted,
  share,
  copiedMessageId,
  onReaction,
  onCopyMessage,
}: {
  message: {
    id: string;
    turn: number;
    agentId: string;
    agentName: string;
    text: string;
    color: string;
  };
  alignment: string;
  isActiveStreaming: boolean;
  reactions: { heart: number; fire: number };
  userReacted: { heart: boolean; fire: boolean };
  share?: {
    payload: string;
    links: { x: string; reddit: string; linkedin: string; whatsapp: string; telegram: string };
  };
  copiedMessageId: string | null;
  onReaction: (turn: number, type: 'heart' | 'fire') => void;
  onCopyMessage: (payload: string, messageId: string) => void;
}) {
  const c = useCopy();
  return (
    <article
      className={cn(
        'w-full max-w-[560px] border-2 bg-black/60 p-5 shadow-[6px_6px_0_rgba(255,255,255,0.2)]',
        alignment,
      )}
      style={{ borderColor: message.color }}
    >
      <header className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em]">
        <span style={{ color: message.color }}>{message.agentName}</span>
        {isActiveStreaming && (
          <span className="text-muted">{c.arenaComponent.messages.thinking}</span>
        )}
      </header>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {message.text ? renderMessageText(message.text) : '...'}
      </p>
      <div className="mt-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-muted">
        <PitButton
          variant="ghost"
          size="sm"
          onClick={() => onReaction(message.turn, 'heart')}
          className={userReacted.heart ? 'text-red-400' : undefined}
        >
          {userReacted.heart ? '♥' : '♡'}
        </PitButton>
        <span>{reactions.heart}</span>
        <PitButton
          variant="ghost"
          size="sm"
          onClick={() => onReaction(message.turn, 'fire')}
          className={userReacted.fire ? 'text-orange-400' : undefined}
        >
          🔥
        </PitButton>
        <span>{reactions.fire}</span>
      </div>
      {share && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted">
          <PitButton
            variant="ghost"
            size="sm"
            onClick={() => onCopyMessage(share.payload, message.id)}
          >
            {copiedMessageId === message.id ? c.arenaComponent.messages.copiedLabel : c.arenaComponent.messages.copyLabel}
          </PitButton>
          {(['x', 'reddit', 'linkedin', 'whatsapp', 'telegram'] as const).map(
            (platform) => (
              <a
                key={platform}
                href={share.links[platform]}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border-2 border-foreground/40 px-2 py-1 uppercase transition hover:border-accent hover:text-accent"
              >
                {platform === 'x' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1)}
              </a>
            ),
          )}
        </div>
      )}
    </article>
  );
}

function WinnerVotePanel({
  agents,
  winnerVotes,
  userVote,
  voteError,
  votePending,
  votedLabel,
  onVote,
}: {
  agents: Preset['agents'];
  winnerVotes: WinnerVoteCounts;
  userVote: string | null;
  voteError: string | null;
  votePending: string | null;
  votedLabel: string | null;
  onVote: (agentId: string) => void;
}) {
  const c = useCopy();
  return (
    <section className="mt-8 w-full border-2 border-foreground/60 bg-black/50 p-6">
      <p className="text-xs uppercase tracking-[0.35em] text-muted">
        {c.arenaComponent.voting.whoWon}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {agents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            onClick={() => onVote(agent.id)}
            disabled={Boolean(userVote) || votePending === agent.id}
            className={cn(
              'flex items-center justify-between border-2 border-foreground/50 bg-black/60 px-4 py-3 text-left text-xs uppercase tracking-[0.3em] text-muted transition hover:border-accent hover:text-accent',
              userVote === agent.id && 'border-accent text-accent',
            )}
          >
            <span>{agent.name}</span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted">
              {c.arenaComponent.voting.votesLabel.replace('{count}', String(winnerVotes[agent.id] ?? 0))}
            </span>
          </button>
        ))}
      </div>
      {userVote && (
        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-accent">
          {c.arenaComponent.voting.voteLocked.replace('{name}', votedLabel ?? '')}
        </p>
      )}
      {voteError && (
        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-red-400">
          {voteError}
        </p>
      )}
    </section>
  );
}

function RerollPanel({
  preset,
  topic,
  boutId,
}: {
  preset: Preset;
  topic?: string | null;
  boutId: string;
}) {
  const c = useCopy();
  const params = new URLSearchParams();
  preset.agents.forEach((agent) => {
    params.append('agent', agent.id);
  });
  if (topic) {
    params.set('topic', topic);
  }
  params.set('from', boutId);

  return (
    <section className="mt-4 w-full border-2 border-foreground/40 bg-black/40 p-6">
      <p className="text-xs uppercase tracking-[0.35em] text-muted">
        {c.arenaComponent.reroll.label}
      </p>
      <p className="mt-2 text-xs text-muted">
        {c.arenaComponent.reroll.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`/arena/custom?${params.toString()}`}
          className="rounded-full border-2 border-accent/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-accent transition hover:bg-accent/10"
        >
          {c.arenaComponent.reroll.tweakAndRerun}
        </a>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderMessageText(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 1) {
      return (
        <span
          key={`action-${index}`}
          className="ml-2 inline-block text-foreground/70 italic"
        >
          {part}
        </span>
      );
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function Arena({
  boutId,
  preset,
  topic,
  model,
  length,
  format,
  estimatedCredits,
  initialTranscript,
  shareLine,
  initialReactions,
  initialWinnerVotes,
  initialUserVote,
}: {
  boutId: string;
  preset: Preset;
  topic?: string | null;
  model?: string | null;
  length?: string | null;
  format?: string | null;
  estimatedCredits?: string | null;
  initialTranscript: TranscriptEntry[];
  shareLine?: string | null;
  initialReactions?: ReactionCountMap;
  initialWinnerVotes?: WinnerVoteCounts;
  initialUserVote?: string | null;
}) {
  const c = useCopy();

  // --- Streaming state ---
  const {
    messages,
    status,
    errorDetail,
    activeAgentId,
    activeMessageId,
    thinkingAgentId,
    shareLine: liveShareLine,
  } = useBout({
    boutId,
    preset,
    topic: topic ?? undefined,
    model: model ?? undefined,
    length: length ?? undefined,
    format: format ?? undefined,
    initialTranscript,
    initialShareLine: shareLine ?? null,
  });

  // --- Extracted hooks ---
  const { reactions, sendReaction, reactionsGivenRef, hasReacted } = useBoutReactions(
    boutId,
    initialReactions,
  );
  const { winnerVotes, userVote, voteError, votePending, castWinnerVote } =
    useBoutVoting(boutId, initialWinnerVotes, initialUserVote);

  const resolvedShareLine = liveShareLine ?? shareLine ?? null;
  const {
    copied,
    copiedMessageId,
    copyTranscript,
    copyMessageShare,
    messageSharePayloads,
  } = useBoutSharing({
    boutId,
    preset,
    topic,
    status,
    messages,
    shareLine: resolvedShareLine,
  });

  // --- Scroll management ---
  const [autoScroll, setAutoScroll] = useState(true);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const threshold = 160;
      const scrollPosition = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      setAutoScroll(docHeight - scrollPosition <= threshold);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!autoScroll) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, autoScroll]);

  const jumpToLatest = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    setAutoScroll(true);
  };

  // --- Engagement tracking ---
  const turnsWatchedRef = useRef(messages.length);
  const userVoteRef = useRef(userVote);
  turnsWatchedRef.current = messages.length;
  userVoteRef.current = userVote;
  useEffect(() => {
    const cleanupScroll = initScrollDepthTracking();
    const cleanupTime = initActiveTimeTracking();
    return () => {
      cleanupScroll();
      cleanupTime();
      trackBoutEngagement(boutId, {
        turnsWatched: turnsWatchedRef.current,
        reactionsGiven: reactionsGivenRef.current,
        votesCast: Boolean(userVoteRef.current),
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Derived data ---
  const alignmentMap = useMemo(() => {
    const positions = ['self-start', 'self-center', 'self-end'];
    const map = new Map<string, string>();
    preset.agents.forEach((agent, index) => {
      map.set(agent.id, positions[index % positions.length]);
    });
    return map;
  }, [preset.agents]);

  const resolveAlignment = (agentId: string) =>
    alignmentMap.get(agentId) ?? 'self-start';

  const thinkingAgent = useMemo(() => {
    if (!thinkingAgentId) return null;
    return preset.agents.find((a) => a.id === thinkingAgentId) ?? null;
  }, [preset.agents, thinkingAgentId]);

  const votedLabel = useMemo(() => {
    if (!userVote) return null;
    return preset.agents.find((a) => a.id === userVote)?.name ?? userVote;
  }, [preset.agents, userVote]);

  // --- Render ---
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-10">
        <BoutHeader
          preset={preset}
          status={status}
          estimatedCredits={estimatedCredits}
          copied={copied}
          onCopyTranscript={copyTranscript}
        />

        <section className="flex flex-1 flex-col gap-6">
          {messages.length === 0 && status !== 'error' && (
            <div className="border-2 border-dashed border-foreground/40 p-8 text-center text-sm text-muted">
              {c.arenaComponent.messages.awaitingFirst}
            </div>
          )}

          {status === 'error' && <BoutError errorDetail={errorDetail} />}

          {messages.map((message, index) => (
            <MessageCard
              key={message.id}
              message={message}
              alignment={resolveAlignment(message.agentId)}
              isActiveStreaming={
                activeAgentId === message.agentId &&
                activeMessageId === message.id &&
                status === 'streaming'
              }
              reactions={reactions[message.turn] ?? { heart: 0, fire: 0 }}
              userReacted={{
                heart: hasReacted(message.turn, 'heart'),
                fire: hasReacted(message.turn, 'fire'),
              }}
              share={messageSharePayloads[index]}
              copiedMessageId={copiedMessageId}
              onReaction={sendReaction}
              onCopyMessage={copyMessageShare}
            />
          ))}

          {thinkingAgent && status === 'streaming' && (
            <article
              className={cn(
                'w-full max-w-[560px] border-2 border-dashed bg-black/40 p-5 text-foreground/80 shadow-[6px_6px_0_rgba(255,255,255,0.15)]',
                resolveAlignment(thinkingAgent.id),
              )}
              style={{ borderColor: thinkingAgent.color }}
            >
              <header className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em]">
                <span style={{ color: thinkingAgent.color }}>
                  {thinkingAgent.name}
                </span>
                <span className="text-muted">{c.arenaComponent.messages.thinking}</span>
              </header>
              <p className="mt-4 text-sm italic text-foreground/60">...</p>
            </article>
          )}

          {status === 'done' && messages.length > 0 && (
            <WinnerVotePanel
              agents={preset.agents}
              winnerVotes={winnerVotes}
              userVote={userVote}
              voteError={voteError}
              votePending={votePending}
              votedLabel={votedLabel}
              onVote={castWinnerVote}
            />
          )}

          {status === 'done' && messages.length > 0 && (
            <RerollPanel preset={preset} topic={topic} boutId={boutId} />
          )}

          <div ref={endRef} />
        </section>

        {!autoScroll && messages.length > 0 && (
          <PitButton
            variant="secondary"
            size="md"
            onClick={jumpToLatest}
            className="fixed bottom-6 left-6 bg-black/70 shadow-[6px_6px_0_rgba(255,255,255,0.15)]"
            aria-label="Jump to latest"
          >
            <span>{c.arenaComponent.latest}</span>
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full border border-foreground/60 text-[10px] text-muted">
              ˅
            </span>
          </PitButton>
        )}
      </div>
    </main>
  );
}
