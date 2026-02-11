'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/cn';
import type { Preset } from '@/lib/presets';
import { useBout } from '@/lib/use-bout';
import type { TranscriptEntry } from '@/db/schema';
import type { ReactionCountMap } from '@/lib/reactions';
import type { WinnerVoteCounts } from '@/lib/winner-votes';

const STATUS_LABELS: Record<string, string> = {
  idle: 'Warming up',
  streaming: 'Live',
  done: 'Complete',
  error: 'Faulted',
};

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
  const {
    messages,
    status,
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
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [shareUrl, setShareUrl] = useState('');
  const [reactions, setReactions] = useState<ReactionCountMap>(
    initialReactions ?? {},
  );
  const [winnerVotes, setWinnerVotes] = useState<WinnerVoteCounts>(
    initialWinnerVotes ?? {},
  );
  const [userVote, setUserVote] = useState<string | null>(
    initialUserVote ?? null,
  );
  const [voteError, setVoteError] = useState<string | null>(null);
  const [votePending, setVotePending] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const threshold = 160;
      const scrollPosition = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const nearBottom = docHeight - scrollPosition <= threshold;
      setAutoScroll(nearBottom);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (!autoScroll) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, autoScroll]);

  const jumpToLatest = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    setAutoScroll(true);
  };

  const renderMessageText = (text: string) => {
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
  };

  const transcript = useMemo(() => {
    return messages
      .map((message) => `${message.agentName}: ${message.text}`)
      .join('\n\n');
  }, [messages]);

  const sharePayload = useMemo(() => {
    if (!transcript && !liveShareLine && !shareLine) return '';
    const origin = shareUrl ? new URL(shareUrl).origin : '';
    const replayUrl = `${origin}/b/${boutId}`;
    const line = (liveShareLine ?? shareLine ?? '').trim();
    const headline =
      line.length > 0 ? line : `THE PIT — ${preset.name} went off.`;

    return [headline, '', replayUrl, '', '🔴 #ThePitArena'].join('\n');
  }, [boutId, liveShareLine, preset.name, shareLine, shareUrl, transcript]);

  const messageSharePayloads = useMemo(() => {
    if (messages.length === 0) return [];
    const origin = shareUrl
      ? new URL(shareUrl).origin
      : '';
    const replayUrl = `${origin}/b/${boutId}`;
    const headline =
      (liveShareLine ?? shareLine ?? '').trim() || `THE PIT — ${preset.name}`;
    const header = [
      headline,
      topic ? `Topic: ${topic}` : null,
      format ? `Format: ${format}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    let runningTranscript = '';

    return messages.map((message) => {
      const line = `${message.agentName}: ${message.text}`;
      runningTranscript = runningTranscript
        ? `${runningTranscript}\n\n${line}`
        : line;
      const payload = [
        header,
        '',
        runningTranscript,
        '',
        `Replay: ${replayUrl}`,
        '',
        '🔴 #ThePitArena',
      ].join('\n');
      const encoded = encodeURIComponent(payload);
      return {
        payload,
        links: {
          x: `https://twitter.com/intent/tweet?text=${encoded}`,
          whatsapp: `https://wa.me/?text=${encoded}`,
          telegram: `https://t.me/share/url?url=${encodeURIComponent(
            replayUrl,
          )}&text=${encoded}`,
        },
      };
    });
  }, [
    boutId,
    format,
    liveShareLine,
    messages,
    preset.name,
    shareLine,
    shareUrl,
    topic,
  ]);

  const copyTranscript = async () => {
    if (!sharePayload) return;
    await navigator.clipboard.writeText(sharePayload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const copyMessageShare = async (payload: string, messageId: string) => {
    await navigator.clipboard.writeText(payload);
    setCopiedMessageId(messageId);
    window.setTimeout(() => setCopiedMessageId(null), 1600);
  };

  const sendReaction = async (turn: number, reactionType: 'heart' | 'fire') => {
    setReactions((prev) => {
      const current = prev[turn] ?? { heart: 0, fire: 0 };
      return {
        ...prev,
        [turn]: {
          ...current,
          [reactionType]: (current[reactionType] ?? 0) + 1,
        },
      };
    });

    try {
      await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boutId,
          turnIndex: turn,
          reactionType,
        }),
      });
    } catch {
      // swallow; reactions are best-effort
    }
  };

  const castWinnerVote = async (agentId: string) => {
    if (userVote || votePending) return;
    setVoteError(null);
    setVotePending(agentId);
    try {
      const res = await fetch('/api/winner-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boutId, agentId }),
      });
      if (res.status === 401) {
        setVoteError('Sign in to cast a winner vote.');
        return;
      }
      if (!res.ok) {
        setVoteError('Vote failed. Try again.');
        return;
      }
      setUserVote(agentId);
      setWinnerVotes((prev) => ({
        ...prev,
        [agentId]: (prev[agentId] ?? 0) + 1,
      }));
    } finally {
      setVotePending(null);
    }
  };

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
    return preset.agents.find((agent) => agent.id === thinkingAgentId) ?? null;
  }, [preset.agents, thinkingAgentId]);

  const votedLabel = useMemo(() => {
    if (!userVote) return null;
    return preset.agents.find((agent) => agent.id === userVote)?.name ?? userVote;
  }, [preset.agents, userVote]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-10">
        <header className="flex flex-col gap-4 border-b-2 border-foreground/70 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-accent">
                THE PIT
              </p>
              <h1 className="mt-3 font-sans text-3xl uppercase tracking-tight md:text-4xl">
                {preset.name}
              </h1>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 text-xs uppercase tracking-[0.3em]">
              <span
                className={cn(
                  'rounded-full border-2 border-foreground/60 px-3 py-1',
                    status === 'streaming' && 'border-accent text-accent',
                    status === 'error' && 'border-red-400 text-red-400',
                  )}
                >
                  {STATUS_LABELS[status] ?? status}
                </span>
                {estimatedCredits && (
                  <span className="rounded-full border-2 border-foreground/50 px-3 py-1 text-muted">
                    Est {estimatedCredits} credits
                  </span>
                )}
                {status === 'done' && (
                  <button
                    type="button"
                    onClick={copyTranscript}
                    className="rounded-full border-2 border-foreground/70 px-3 py-1 transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
                  >
                    {copied ? 'Copied' : 'Share'}
                </button>
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

        <section className="flex flex-1 flex-col gap-6">
          {messages.length === 0 && (
            <div className="border-2 border-dashed border-foreground/40 p-8 text-center text-sm text-muted">
              Awaiting first strike.
            </div>
          )}

          {messages.map((message, index) => {
            const counts = reactions[message.turn] ?? { heart: 0, fire: 0 };
            const share = messageSharePayloads[index];
            return (
            <article
              key={message.id}
              className={cn(
                'w-full max-w-[560px] border-2 bg-black/60 p-5 shadow-[6px_6px_0_rgba(255,255,255,0.2)]',
                resolveAlignment(message.agentId),
              )}
              style={{ borderColor: message.color }}
            >
              <header className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em]">
                <span style={{ color: message.color }}>{message.agentName}</span>
                {activeAgentId === message.agentId &&
                  activeMessageId === message.id &&
                  status === 'streaming' && (
                  <span className="text-muted">Thinking...</span>
                )}
              </header>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {message.text ? renderMessageText(message.text) : '...'}
              </p>
              <div className="mt-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-muted">
                <button
                  type="button"
                  onClick={() => sendReaction(message.turn, 'heart')}
                  className="rounded-full border-2 border-foreground/40 px-2 py-1 transition hover:border-accent hover:text-accent"
                >
                  ♥
                </button>
                <span>{counts.heart}</span>
                <button
                  type="button"
                  onClick={() => sendReaction(message.turn, 'fire')}
                  className="rounded-full border-2 border-foreground/40 px-2 py-1 transition hover:border-accent hover:text-accent"
                >
                  🔥
                </button>
                <span>{counts.fire}</span>
              </div>
              {share && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted">
                  <button
                    type="button"
                    onClick={() => copyMessageShare(share.payload, message.id)}
                    className="rounded-full border-2 border-foreground/40 px-2 py-1 transition hover:border-accent hover:text-accent"
                  >
                    {copiedMessageId === message.id ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={share.links.x}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border-2 border-foreground/40 px-2 py-1 transition hover:border-accent hover:text-accent"
                  >
                    X
                  </a>
                  <a
                    href={share.links.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border-2 border-foreground/40 px-2 py-1 transition hover:border-accent hover:text-accent"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={share.links.telegram}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border-2 border-foreground/40 px-2 py-1 transition hover:border-accent hover:text-accent"
                  >
                    Telegram
                  </a>
                </div>
              )}
            </article>
          );
          })}
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
                <span className="text-muted">Thinking...</span>
              </header>
              <p className="mt-4 text-sm italic text-foreground/60">...</p>
            </article>
          )}
          {status === 'done' && messages.length > 0 && (
            <section className="mt-8 w-full border-2 border-foreground/60 bg-black/50 p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-muted">
                Who won?
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {preset.agents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => castWinnerVote(agent.id)}
                    disabled={Boolean(userVote) || votePending === agent.id}
                    className={cn(
                      'flex items-center justify-between border-2 border-foreground/50 bg-black/60 px-4 py-3 text-left text-xs uppercase tracking-[0.3em] text-muted transition hover:border-accent hover:text-accent',
                      userVote === agent.id &&
                        'border-accent text-accent',
                    )}
                  >
                    <span>{agent.name}</span>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-muted">
                      {winnerVotes[agent.id] ?? 0} votes
                    </span>
                  </button>
                ))}
              </div>
              {userVote && (
                <p className="mt-4 text-xs uppercase tracking-[0.3em] text-accent">
                  Vote locked: {votedLabel}
                </p>
              )}
              {voteError && (
                <p className="mt-4 text-xs uppercase tracking-[0.3em] text-red-400">
                  {voteError}
                </p>
              )}
            </section>
          )}
          <div ref={endRef} />
        </section>

        {!autoScroll && messages.length > 0 && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full border-2 border-foreground/60 bg-black/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted shadow-[6px_6px_0_rgba(255,255,255,0.15)] transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
            aria-label="Jump to latest"
          >
            <span>Latest</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-foreground/60 text-[10px] text-muted">
              ˅
            </span>
          </button>
        )}
      </div>
    </main>
  );
}
