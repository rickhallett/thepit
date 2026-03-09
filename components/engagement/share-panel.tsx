"use client";

/**
 * SharePanel — Social sharing buttons for completed bouts.
 *
 * Creates a short link on mount if not provided, then shows share buttons
 * for X, Reddit, WhatsApp, Telegram, LinkedIn, and Copy Link.
 */

import { useEffect, useState, useCallback } from "react";

interface SharePanelProps {
  boutId: string;
  shareLine: string;
  shortSlug?: string;
}

const SHARE_PLATFORMS = [
  { id: "x", label: "X" },
  { id: "reddit", label: "Reddit" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "telegram", label: "Telegram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "copy", label: "Copy Link" },
] as const;

type PlatformId = (typeof SHARE_PLATFORMS)[number]["id"];

export function SharePanel({ boutId, shareLine, shortSlug }: SharePanelProps) {
  const [slug, setSlug] = useState(shortSlug);
  const [loading, setLoading] = useState(!shortSlug);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Create short link on mount if not provided
  useEffect(() => {
    if (shortSlug) return;

    async function createLink() {
      try {
        const res = await fetch("/api/short-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boutId }),
        });
        if (res.ok) {
          const data = await res.json();
          setSlug(data.slug);
        } else {
          setError("Failed to create share link");
        }
      } catch {
        setError("Network error — could not create share link");
      } finally {
        setLoading(false);
      }
    }

    createLink();
  }, [boutId, shortSlug]);

  const getShareUrl = useCallback(() => {
    if (!slug) return "";
    return `${window.location.origin}/b/${slug}`;
  }, [slug]);

  const handleShare = useCallback(
    async (platform: PlatformId) => {
      const url = getShareUrl();
      if (!url) return;

      const text = encodeURIComponent(shareLine);
      const encodedUrl = encodeURIComponent(url);

      switch (platform) {
        case "x":
          window.open(
            `https://x.com/intent/tweet?text=${text}&url=${encodedUrl}`,
            "_blank",
            "noopener,noreferrer",
          );
          break;
        case "reddit":
          window.open(
            `https://reddit.com/submit?title=${text}&url=${encodedUrl}`,
            "_blank",
            "noopener,noreferrer",
          );
          break;
        case "whatsapp":
          window.open(`https://wa.me/?text=${text}%20${encodedUrl}`, "_blank", "noopener,noreferrer");
          break;
        case "telegram":
          window.open(
            `https://t.me/share/url?url=${encodedUrl}&text=${text}`,
            "_blank",
            "noopener,noreferrer",
          );
          break;
        case "linkedin":
          window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            "_blank",
            "noopener,noreferrer",
          );
          break;
        case "copy":
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          break;
      }
    },
    [getShareUrl, shareLine],
  );

  if (loading) {
    return (
      <div
        data-testid="share-panel"
        className="mt-6 flex items-center gap-2 text-stone-500"
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-stone-500" />
        Creating share link...
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="share-panel" className="mt-6 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!slug) {
    return null;
  }

  return (
    <div data-testid="share-panel" className="mt-6">
      <p className="mb-3 text-sm text-stone-500">Share this debate</p>
      <div className="flex flex-wrap gap-2">
        {SHARE_PLATFORMS.map((platform) => (
          <button
            key={platform.id}
            onClick={() => handleShare(platform.id)}
            className="rounded border border-stone-600 bg-stone-800 px-3 py-1.5 text-sm text-stone-300 transition-colors hover:border-stone-500 hover:bg-stone-700"
          >
            {platform.id === "copy" && copied ? "Copied!" : platform.label}
          </button>
        ))}
      </div>
    </div>
  );
}
