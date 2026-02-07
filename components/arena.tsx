'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/cn';
import type { Preset } from '@/lib/presets';
import { useBout } from '@/lib/use-bout';
import type { TranscriptEntry } from '@/db/schema';

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
  estimatedCredits,
  initialTranscript,
}: {
  boutId: string;
  preset: Preset;
  topic?: string | null;
  model?: string | null;
  estimatedCredits?: string | null;
  initialTranscript: TranscriptEntry[];
}) {
  const { messages, status, activeAgentId, activeMessageId } = useBout({
    boutId,
    preset,
    topic: topic ?? undefined,
    model: model ?? undefined,
    initialTranscript,
  });
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
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

  const copyTranscript = async () => {
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

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
            <div className="flex items-center gap-4 text-xs uppercase tracking-[0.3em]">
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

          {messages.map((message) => (
            <article
              key={message.id}
              className="border-2 bg-black/60 p-5 shadow-[6px_6px_0_rgba(255,255,255,0.2)]"
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
            </article>
          ))}
          <div ref={endRef} />
        </section>

        {!autoScroll && messages.length > 0 && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="fixed bottom-6 right-6 rounded-full border-2 border-foreground/60 bg-black/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted shadow-[6px_6px_0_rgba(255,255,255,0.15)] transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
            aria-label="Jump to latest"
          >
            Latest v
          </button>
        )}
      </div>
    </main>
  );
}
