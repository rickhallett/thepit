'use client';

import { useState } from 'react';
import { buildShareLinks } from '@/lib/brand';
import { trackEvent } from '@/lib/analytics';
import { PitButton } from '@/components/ui/button';

interface SharePanelProps {
  boutId: string;
  sharePayload: string;
  replayUrl: string;
}

const PLATFORMS = [
  { key: 'x', label: 'X' },
  { key: 'reddit', label: 'Reddit' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'linkedin', label: 'LinkedIn' },
] as const;

export function SharePanel({ boutId, sharePayload, replayUrl }: SharePanelProps) {
  const [copied, setCopied] = useState(false);
  const links = buildShareLinks(sharePayload, replayUrl);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sharePayload);
    setCopied(true);
    trackEvent('bout_shared', { bout_id: boutId, method: 'copy_share_panel' });
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleShare = (platform: string, url: string) => {
    trackEvent('bout_shared', { bout_id: boutId, method: platform });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="mt-6 w-full border-2 border-foreground/50 bg-black/50 p-6">
      <p className="text-xs uppercase tracking-[0.35em] text-muted">
        Share this battle
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {PLATFORMS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleShare(key, links[key])}
            className="rounded-full border-2 border-foreground/40 px-3 py-1.5 text-xs uppercase tracking-[0.3em] text-muted transition hover:border-accent hover:text-accent"
          >
            {label}
          </button>
        ))}
        <PitButton
          variant="secondary"
          size="sm"
          onClick={handleCopy}
        >
          {copied ? 'Copied' : 'Copy'}
        </PitButton>
      </div>
    </section>
  );
}
