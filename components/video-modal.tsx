'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Change this to the real YouTube video ID when ready.
// e.g. "dQw4w9WgXcQ"
// ---------------------------------------------------------------------------
const YOUTUBE_VIDEO_ID = 'aYhWhmWaIPg';

// ---------------------------------------------------------------------------
// VideoExplainerButton — self-contained button + modal
// ---------------------------------------------------------------------------

export function VideoExplainerButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-2 border-foreground/60 px-8 py-4 text-xs uppercase tracking-[0.3em] text-foreground transition hover:border-accent hover:text-accent hover:shadow-[0_0_20px_rgba(215,255,63,0.15)]"
      >
        §
      </button>
      {open && <VideoModal onClose={() => setOpen(false)} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// VideoModal — full-screen overlay with YouTube embed
// ---------------------------------------------------------------------------

function VideoModal({ onClose }: { onClose: () => void }) {
  // Stable close ref for escape key
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Escape key dismisses
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleClose]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85"
        role="presentation"
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'absolute left-1/2 top-1/2 w-[min(800px,90vw)] -translate-x-1/2 -translate-y-1/2',
          'border-2 border-accent/70 bg-black/95 p-4 shadow-[10px_10px_0_rgba(255,255,255,0.2)]',
        )}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.35em] text-accent">
            The Pit — Explained
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border-2 border-foreground/60 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted transition hover:border-accent hover:text-accent"
          >
            Close
          </button>
        </div>

        {/* 16:9 responsive video container */}
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0`}
            title="What is The Pit?"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
