'use client';

import { useEffect, useState } from 'react';
import { buildShareLinks } from '@/lib/brand';
import { trackEvent } from '@/lib/analytics';
import { PitButton } from '@/components/ui/button';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Platform definitions with per-platform CTAs
// ---------------------------------------------------------------------------

const PLATFORMS = [
  { key: 'x', label: 'X / Twitter', cta: 'Post it' },
  { key: 'reddit', label: 'Reddit', cta: 'Submit' },
  { key: 'whatsapp', label: 'WhatsApp', cta: 'Send' },
  { key: 'telegram', label: 'Telegram', cta: 'Share' },
  { key: 'linkedin', label: 'LinkedIn', cta: 'Post' },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ShareModalProps {
  /** Controls visibility. `null` hides the modal. */
  shareData: {
    boutId: string;
    presetName: string;
    sharePayload: string;
    replayUrl: string;
  } | null;
  onClose: () => void;
}

export function ShareModal({ shareData, onClose }: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // Escape key dismisses
  useEffect(() => {
    if (!shareData) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shareData, onClose]);

  // Track modal view — depend on boutId (stable string) not shareData (new object each render)
  const boutId = shareData?.boutId;
  useEffect(() => {
    if (!boutId) return;
    trackEvent('share_modal_shown', {
      bout_id: boutId,
    });
  }, [boutId]);

  if (!shareData) return null;

  const links = buildShareLinks(shareData.sharePayload, shareData.replayUrl);

  const handleShare = (platform: string, url: string) => {
    trackEvent('bout_shared', {
      bout_id: shareData.boutId,
      method: `modal_${platform}`,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareData.sharePayload);
      setCopiedAll(true);
      trackEvent('bout_shared', {
        bout_id: shareData.boutId,
        method: 'modal_copy',
      });
      window.setTimeout(() => setCopiedAll(false), 1600);
    } catch {
      // Clipboard API requires secure context — fail silently
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareData.replayUrl);
      setCopiedLink(true);
      trackEvent('bout_shared', {
        bout_id: shareData.boutId,
        method: 'modal_copy_link',
      });
      window.setTimeout(() => setCopiedLink(false), 1600);
    } catch {
      // Clipboard API requires secure context — fail silently
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        role="presentation"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'absolute left-1/2 top-1/2 w-[min(520px,92vw)] -translate-x-1/2 -translate-y-1/2',
          'border-2 border-accent/70 bg-black/95 p-6 shadow-[10px_10px_0_rgba(255,255,255,0.2)]',
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-accent">
              Battle complete
            </p>
            <h2 className="mt-2 text-xl uppercase tracking-tight">
              {shareData.presetName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-foreground/60 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted transition hover:border-accent hover:text-accent"
          >
            Close
          </button>
        </div>

        {/* CTA */}
        <p className="mt-4 text-sm text-foreground/80">
          That was a good one. Share the replay and let others weigh in.
        </p>

        {/* Replay URL with copy */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 truncate rounded border border-foreground/30 bg-black/60 px-3 py-2 text-xs text-muted">
            {shareData.replayUrl}
          </div>
          <PitButton variant="primary" size="sm" onClick={handleCopyLink}>
            {copiedLink ? 'Copied' : 'Copy link'}
          </PitButton>
        </div>

        {/* Platform buttons */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PLATFORMS.map(({ key, label, cta }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleShare(key, links[key])}
              className="flex flex-col items-center gap-1 border-2 border-foreground/40 bg-black/60 px-3 py-3 text-center transition hover:border-accent hover:text-accent"
            >
              <span className="text-xs uppercase tracking-[0.3em] text-foreground/90">
                {label}
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-muted">
                {cta}
              </span>
            </button>
          ))}

          {/* Copy full share text */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex flex-col items-center gap-1 border-2 border-foreground/40 bg-black/60 px-3 py-3 text-center transition hover:border-accent hover:text-accent"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-foreground/90">
              {copiedAll ? 'Copied!' : 'Copy all'}
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted">
              Full transcript
            </span>
          </button>
        </div>

        {/* Footer nudge */}
        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.3em] text-muted">
          Shared bouts get more votes and reactions
        </p>
      </div>
    </div>
  );
}
