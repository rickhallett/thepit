// Client-side hook for streaming a bout (multi-agent debate) in real time.
//
// Connects to /api/run-bout via SSE and renders agent turns as they stream.
// Uses a "pending message" pattern to simulate a thinking delay: when a new
// turn arrives, tokens are buffered invisibly for 2-4 seconds (random) before
// the message appears, creating a natural "thinking..." UX. Once flushed,
// subsequent text-deltas append to the visible message in real time.
//
// State machine (per turn):
//   data-turn event -> schedulePendingMessage (buffer tokens, show thinking indicator)
//   [2-4s timeout]  -> flushPendingMessage (make message visible, start streaming)
//   text-delta      -> append to visible message (or buffer if still pending)

'use client';

import { useEffect, useRef, useState } from 'react';
import { parseJsonEventStream, uiMessageChunkSchema } from 'ai';

import { DEFAULT_AGENT_COLOR, type Preset } from './presets';
import type { TranscriptEntry } from '@/db/schema';
import { trackEvent } from '@/lib/analytics';

export type BoutMessage = {
  id: string;
  turn: number;
  agentId: string;
  agentName: string;
  color: string;
  text: string;
};

type BoutStatus = 'idle' | 'streaming' | 'done' | 'error';

export type ErrorDetail = {
  code: number;
  message: string;
  /** Rate limit metadata — present only on 429 responses. */
  rateLimit?: {
    remaining: number;
    resetAt: number;
    limit?: number;
    currentTier?: string;
    upgradeTiers?: Array<{ tier: string; limit: number | null; url: string }>;
  };
};

type UseBoutOptions = {
  boutId: string;
  preset: Preset;
  initialTranscript?: TranscriptEntry[];
  initialShareLine?: string | null;
  topic?: string;
  model?: string;
  length?: string;
  format?: string;
};

type StreamEvent = {
  type: string;
  data?: {
    turn?: number;
    agentId?: string;
    agentName?: string;
    color?: string;
    text?: string;
  };
  delta?: string;
};

export function useBout({
  boutId,
  preset,
  topic,
  model,
  length,
  initialTranscript = [],
  initialShareLine = null,
  format,
}: UseBoutOptions) {
  const [messages, setMessages] = useState<BoutMessage[]>(() => {
    if (initialTranscript.length === 0) return [];
    return initialTranscript.map((entry) => {
      const agent = preset.agents.find((item) => item.id === entry.agentId);
      return {
        id: `${boutId}-${entry.turn}-${entry.agentId}`,
        turn: entry.turn,
        agentId: entry.agentId,
        agentName: entry.agentName ?? agent?.name ?? entry.agentId,
        color: agent?.color ?? DEFAULT_AGENT_COLOR,
        text: entry.text,
      };
    });
  });
  const [status, setStatus] = useState<BoutStatus>(
    initialTranscript.length ? 'done' : 'idle',
  );
  const [shareLine, setShareLine] = useState<string | null>(initialShareLine);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [thinkingAgentId, setThinkingAgentId] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<ErrorDetail | null>(null);
  // Refs for the thinking-delay state machine:
  // - activeMessageIdRef: the currently visible message receiving text-deltas
  // - pendingMessageRef:  a message buffering tokens before it becomes visible
  // - thinkingTimeoutRef: the timer that triggers the pending -> visible transition
  const activeMessageIdRef = useRef<string | null>(null);
  const turnRef = useRef(initialTranscript.length);
  const pendingMessageRef = useRef<{
    id: string;
    turn: number;
    agentId: string;
    agentName: string;
    color: string;
    buffer: string;
  } | null>(null);
  const thinkingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialTranscript.length) return;
    const controller = new AbortController();
    let cancelled = false;

    const clearThinkingTimeout = () => {
      if (thinkingTimeoutRef.current !== null) {
        window.clearTimeout(thinkingTimeoutRef.current);
        thinkingTimeoutRef.current = null;
      }
    };

    const flushPendingMessage = () => {
      const pending = pendingMessageRef.current;
      if (!pending) return;
      pendingMessageRef.current = null;
      clearThinkingTimeout();
      setThinkingAgentId(null);
      activeMessageIdRef.current = pending.id;
      setActiveAgentId(pending.agentId);
      setActiveMessageId(pending.id);
      setMessages((prev) => [
        ...prev,
        {
          id: pending.id,
          turn: pending.turn,
          agentId: pending.agentId,
          agentName: pending.agentName,
          color: pending.color,
          text: pending.buffer,
        },
      ]);
    };

    const schedulePendingMessage = (pending: {
      id: string;
      turn: number;
      agentId: string;
      agentName: string;
      color: string;
    }) => {
      // Flush any existing pending message before scheduling the new one.
      // Without this, fast turns (arriving before the thinking delay expires)
      // silently discard the previous message's buffered text.
      flushPendingMessage();
      pendingMessageRef.current = { ...pending, buffer: '' };
      setThinkingAgentId(pending.agentId);
      setActiveAgentId(null);
      setActiveMessageId(null);
      activeMessageIdRef.current = null;
      clearThinkingTimeout();

      // Random 2-4s delay simulates the agent "thinking" before responding.
      // Tokens arriving during this window are buffered and flushed all at once.
      const delayMs = Math.floor(2000 + Math.random() * 2000);
      thinkingTimeoutRef.current = window.setTimeout(() => {
        flushPendingMessage();
      }, delayMs);
    };

    const boutStartTime = Date.now();
    const run = async () => {
      setStatus('streaming');
      trackEvent('bout_started', { presetId: preset.id, model: model ?? null });

      // BYOK key is now stashed in an HTTP-only cookie by /api/byok-stash.
      // The /api/run-bout endpoint reads it directly from the cookie —
      // the key never touches client-side JS storage.

      const payload: Record<string, unknown> = {
        boutId,
        presetId: preset.id,
        topic,
        model,
        length,
        format,
      };
      const response = await fetch('/api/run-bout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let detail: ErrorDetail = { code: response.status, message: 'The arena short-circuited.' };
        try {
          const body = await response.json();
          if (body?.error) detail = { code: response.status, message: body.error };
          // Extract structured rate limit metadata from 429 responses.
          if (response.status === 429 && body?.code === 'RATE_LIMITED') {
            detail.rateLimit = {
              remaining: body.remaining ?? 0,
              resetAt: body.resetAt ?? 0,
              limit: body.limit,
              currentTier: body.currentTier,
              upgradeTiers: body.upgradeTiers,
            };
          }
        } catch { /* non-JSON response */ }
        setErrorDetail(detail);
        setStatus('error');
        return;
      }

      const handleEvent = (event: StreamEvent) => {
        if (!event || typeof event.type !== 'string') return;

        if (event.type === 'error') {
          setErrorDetail({
            code: 0,
            message: event.data?.text ?? 'The arena short-circuited.',
          });
          setStatus('error');
          return;
        }

        if (event.type === 'data-share-line') {
          if (event.data?.text) {
            setShareLine(event.data.text);
          }
          return;
        }

        if (event.type === 'data-turn') {
          const data = event.data ?? {};
          const turn =
            typeof data.turn === 'number' ? data.turn : turnRef.current;
          if (typeof data.turn !== 'number') {
            turnRef.current += 1;
          }
          const messageId = `${boutId}-${turn}-${data.agentId ?? 'agent'}`;
          schedulePendingMessage({
            id: messageId,
            turn,
            agentId: data.agentId ?? 'agent',
            agentName: data.agentName ?? 'Agent',
            color: data.color ?? DEFAULT_AGENT_COLOR,
          });
          return;
        }

        if (event.type === 'text-delta') {
          const activeId = activeMessageIdRef.current;
          if (!activeId) {
            const pending = pendingMessageRef.current;
            if (pending) {
              pending.buffer += event.delta ?? '';
            }
            return;
          }
          const delta = event.delta ?? '';
          if (!delta) return;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === activeId
                ? { ...message, text: message.text + delta }
                : message,
            ),
          );
        }
      };

      const parsedStream = parseJsonEventStream({
        stream: response.body,
        schema: uiMessageChunkSchema,
      });
      const reader = parsedStream.getReader();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value?.success) {
          continue;
        }
        handleEvent(value.value as StreamEvent);
      }

      if (!cancelled) {
        flushPendingMessage();
        setStatus('done');
        setActiveAgentId(null);
        setActiveMessageId(null);
        setThinkingAgentId(null);
        trackEvent('bout_completed', {
          presetId: preset.id,
          model: model ?? null,
          durationMs: Date.now() - boutStartTime,
        });
      }
    };

    run().catch(() => {
      if (!cancelled) {
        setErrorDetail({ code: 0, message: 'The arena short-circuited.' });
        setStatus('error');
        setThinkingAgentId(null);
        trackEvent('bout_error', { presetId: preset.id, model: model ?? null });
      }
    });

    return () => {
      cancelled = true;
      clearThinkingTimeout();
      pendingMessageRef.current = null;
      controller.abort();
    };
  }, [boutId, initialTranscript.length, preset.id, topic, model, length, format]);

  return {
    messages,
    status,
    errorDetail,
    activeAgentId,
    activeMessageId,
    thinkingAgentId,
    shareLine,
  };
}
