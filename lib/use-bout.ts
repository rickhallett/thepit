'use client';

import { useEffect, useRef, useState } from 'react';
import { parseJsonEventStream, uiMessageChunkSchema } from 'ai';

import type { Preset } from './presets';

export type BoutMessage = {
  id: string;
  turn: number;
  agentId: string;
  agentName: string;
  color: string;
  text: string;
};

type TranscriptEntry = {
  turn: number;
  agentId: string;
  agentName: string;
  text: string;
};

type BoutStatus = 'idle' | 'streaming' | 'done' | 'error';

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
        color: agent?.color ?? '#f8fafc',
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
      pendingMessageRef.current = { ...pending, buffer: '' };
      setThinkingAgentId(pending.agentId);
      setActiveAgentId(null);
      setActiveMessageId(null);
      activeMessageIdRef.current = null;
      clearThinkingTimeout();

      const delayMs = Math.floor(2000 + Math.random() * 2000);
      thinkingTimeoutRef.current = window.setTimeout(() => {
        flushPendingMessage();
      }, delayMs);
    };

    const run = async () => {
      setStatus('streaming');
      const response = await fetch('/api/run-bout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boutId,
          presetId: preset.id,
          topic,
          model,
          length,
          format,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        setStatus('error');
        return;
      }

      const handleEvent = (event: StreamEvent) => {
        if (!event || typeof event.type !== 'string') return;

        if (event.type === 'error') {
          setStatus('error');
          return;
        }

        if (event.type === 'share-line') {
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
            color: data.color ?? '#f8fafc',
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
      }
    };

    run().catch(() => {
      if (!cancelled) {
        setStatus('error');
        setThinkingAgentId(null);
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
    activeAgentId,
    activeMessageId,
    thinkingAgentId,
    shareLine,
  };
}
