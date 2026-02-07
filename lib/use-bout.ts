'use client';

import { useEffect, useRef, useState } from 'react';
import { parseJsonEventStream, uiMessageChunkSchema } from 'ai';

import type { Preset } from './presets';

export type BoutMessage = {
  id: string;
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
  };
  delta?: string;
};

export function useBout({
  boutId,
  preset,
  topic,
  model,
  length,
  format,
  initialTranscript = [],
}: UseBoutOptions) {
  const [messages, setMessages] = useState<BoutMessage[]>(() => {
    if (initialTranscript.length === 0) return [];
    return initialTranscript.map((entry) => {
      const agent = preset.agents.find((item) => item.id === entry.agentId);
      return {
        id: `${boutId}-${entry.turn}-${entry.agentId}`,
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
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const activeMessageIdRef = useRef<string | null>(null);
  const turnRef = useRef(initialTranscript.length);

  useEffect(() => {
    if (initialTranscript.length) return;
    const controller = new AbortController();
    let cancelled = false;

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

        if (event.type === 'data-turn') {
          const data = event.data ?? {};
          const turn =
            typeof data.turn === 'number' ? data.turn : turnRef.current;
          if (typeof data.turn !== 'number') {
            turnRef.current += 1;
          }
          const messageId = `${boutId}-${turn}-${data.agentId ?? 'agent'}`;
          activeMessageIdRef.current = messageId;
          setActiveAgentId(data.agentId ?? null);
          setActiveMessageId(messageId);
          setMessages((prev) => [
            ...prev,
            {
              id: messageId,
              agentId: data.agentId ?? 'agent',
              agentName: data.agentName ?? 'Agent',
              color: data.color ?? '#f8fafc',
              text: '',
            },
          ]);
          return;
        }

        if (event.type === 'text-delta') {
          const activeId = activeMessageIdRef.current;
          if (!activeId) return;
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
        setStatus('done');
        setActiveAgentId(null);
        setActiveMessageId(null);
      }
    };

    run().catch(() => {
      if (!cancelled) {
        setStatus('error');
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    boutId,
    initialTranscript.length,
    preset.id,
    topic,
    model,
    length,
    format,
  ]);

  return { messages, status, activeAgentId, activeMessageId };
}
