'use client';

import { useState, useEffect, useMemo } from 'react';
import { trackEvent } from '@/lib/analytics';
import { BRAND, buildShareLinks } from '@/lib/brand';
import type { Preset } from '@/lib/presets';

type MessageSharePayload = {
  payload: string;
  links: ReturnType<typeof buildShareLinks>;
};

const DELIMITER = '─────────────────────────';

/**
 * Hook for managing bout sharing state: share URL, short links,
 * share text generation, and clipboard operations.
 */
export function useBoutSharing({
  boutId,
  preset,
  topic,
  format,
  status,
  messages,
  shareLine,
}: {
  boutId: string;
  preset: Preset;
  topic?: string | null;
  format?: string | null;
  status: string;
  messages: { id: string; agentName: string; text: string }[];
  shareLine: string | null;
}) {
  const [shareUrl, setShareUrl] = useState(() =>
    typeof window !== 'undefined' ? window.location.href : '',
  );
  const [shortSlug, setShortSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Create/fetch short link when bout completes
  useEffect(() => {
    if (status !== 'done' || shortSlug) return;
    fetch('/api/short-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boutId }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.slug) setShortSlug(data.slug);
      })
      .catch(() => {
        // Non-critical — fall back to /b/ URLs
      });
  }, [boutId, shortSlug, status]);

  const replayUrl = useMemo(() => {
    const origin = shareUrl ? new URL(shareUrl).origin : '';
    return shortSlug ? `${origin}/s/${shortSlug}` : `${origin}/b/${boutId}`;
  }, [boutId, shareUrl, shortSlug]);

  const sharePayload = useMemo(() => {
    if (messages.length === 0 && !shareLine) return '';
    const line = (shareLine ?? '').trim();
    const headline =
      line.length > 0 ? line : `THE PIT — ${preset.name} went off.`;
    return [headline, '', replayUrl, '', `🔴 ${BRAND.hashtag}`].join('\n');
  }, [shareLine, preset.name, replayUrl, messages.length]);

  const messageSharePayloads: MessageSharePayload[] = useMemo(() => {
    if (messages.length === 0) return [];
    const headline =
      (shareLine ?? '').trim() || `THE PIT — ${preset.name}`;

    // Build formatted header
    const headerLines = [`🏟️ ${headline}`];
    if (topic) {
      headerLines.push('');
      headerLines.push(`    Topic: ${topic}`);
    }
    const header = headerLines.join('\n');

    let runningTranscript = '';

    return messages.map((message) => {
      const formattedTurn = [
        DELIMITER,
        `*${message.agentName}*`,
        message.text,
      ].join('\n');

      runningTranscript = runningTranscript
        ? `${runningTranscript}\n\n${formattedTurn}`
        : formattedTurn;

      const payload = [
        header,
        '',
        runningTranscript,
        '',
        `Replay: ${replayUrl}`,
        '',
        `🔴 ${BRAND.hashtag}`,
      ].join('\n');
      return {
        payload,
        links: buildShareLinks(payload, replayUrl),
      };
    });
  }, [messages, preset.name, replayUrl, shareLine, topic]);

  const copyTranscript = async () => {
    if (!sharePayload) return;
    await navigator.clipboard.writeText(sharePayload);
    setCopied(true);
    trackEvent('bout_shared', { boutId, method: 'copy_header' });
    window.setTimeout(() => setCopied(false), 1600);
  };

  const copyMessageShare = async (payload: string, messageId: string) => {
    await navigator.clipboard.writeText(payload);
    setCopiedMessageId(messageId);
    trackEvent('bout_shared', { boutId, method: 'copy_message' });
    window.setTimeout(() => setCopiedMessageId(null), 1600);
  };

  return {
    shareUrl,
    replayUrl,
    sharePayload,
    messageSharePayloads,
    copied,
    copiedMessageId,
    copyTranscript,
    copyMessageShare,
  };
}
