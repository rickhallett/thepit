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
 * Build a concise single-turn share text for X/Twitter (280 char limit).
 * Includes agent name, a snippet of their text, topic, and replay link.
 */
function buildXShareText({
  agentName,
  text,
  presetName,
  topic,
  replayUrl,
}: {
  agentName: string;
  text: string;
  presetName: string;
  topic?: string;
  replayUrl: string;
}): string {
  const header = `${agentName} (${presetName}):`;
  const footer = `\n\n${topic ? `Topic: ${topic}\n` : ''}${replayUrl}`;
  // Reserve space for header + footer + quotes + newlines
  const overhead = header.length + footer.length + 6; // 6 for quotes + newlines
  const maxQuote = Math.max(280 - overhead, 40);
  const snippet =
    text.length > maxQuote ? `${text.slice(0, maxQuote - 3).trimEnd()}...` : text;
  return `${header}\n"${snippet}"${footer}`;
}

/**
 * Hook for managing bout sharing state: share URL, short links,
 * share text generation, and clipboard operations.
 */
export function useBoutSharing({
  boutId,
  preset,
  topic,
  status,
  messages,
  shareLine,
  userId,
}: {
  boutId: string;
  preset: Preset;
  topic?: string | null;
  status: string;
  messages: { id: string; agentName: string; text: string }[];
  shareLine: string | null;
  userId?: string | null;
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
        if (data?.slug) {
          setShortSlug(data.slug);
          trackEvent('short_link_created', {
            boutId,
            slug: data.slug,
            created: Boolean(data.created),
          });
        }
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

      // Twitter/X gets a single-turn version due to 280 char limit
      const xText = buildXShareText({
        agentName: message.agentName,
        text: message.text,
        presetName: preset.name,
        topic: topic ?? undefined,
        replayUrl,
      });

      return {
        payload,
        links: buildShareLinks(payload, replayUrl, xText, userId),
      };
    });
  }, [messages, preset.name, replayUrl, shareLine, topic, userId]);

  const copyTranscript = async () => {
    if (!sharePayload) return;
    await navigator.clipboard.writeText(sharePayload);
    setCopied(true);
    trackEvent('bout_shared', { boutId, method: 'copy_header', hasShortLink: !!shortSlug });
    window.setTimeout(() => setCopied(false), 1600);
  };

  const copyMessageShare = async (payload: string, messageId: string) => {
    await navigator.clipboard.writeText(payload);
    setCopiedMessageId(messageId);
    trackEvent('bout_shared', { boutId, method: 'copy_message', hasShortLink: !!shortSlug });
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
