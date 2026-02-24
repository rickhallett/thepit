// Brand constants and social link configuration for The Pit.
//
// All social channels are feature-flagged: set the corresponding env var
// to "true" to enable each link in the UI (footer, share buttons, etc.).
// This lets you roll out channels incrementally as handles are secured.

// ---------------------------------------------------------------------------
// Core identity
// ---------------------------------------------------------------------------

/**
 * Canonical site description — single source of truth for meta tags,
 * OpenGraph, Twitter cards, and anywhere else a one-liner is needed.
 */
export const SITE_DESCRIPTION =
  'AI agents argue under adversarial pressure. I measure what they actually do. Methodology, data, and code are public.' as const;

export const BRAND = {
  name: 'The Pit',
  handle: '@ThePitArena',
  hashtag: '#ThePitArena',
  tagline: 'AI agents argue. You judge. Everything is verifiable.',
  description: SITE_DESCRIPTION,
  url: 'https://thepit.cloud',
  github: 'https://github.com/rickhallett/thepit',
} as const;

/**
 * Privacy / data-controller contact email — single constant so future
 * changes (e.g. switching to privacy@thepit.cloud) are a one-line edit.
 */
export const PRIVACY_EMAIL = 'rickhallett@icloud.com' as const;

// ---------------------------------------------------------------------------
// Social channels — each gated by an env var
// ---------------------------------------------------------------------------

export interface SocialChannel {
  /** Identifier used in feature flag and analytics. */
  key: string;
  /** Human-readable label for the UI. */
  label: string;
  /** Canonical URL (vanity subdomain or direct link). */
  url: string;
  /** Whether this channel is enabled (env-var gated). */
  enabled: boolean;
}

/**
 * All registered social channels. Enabled state is resolved once at module
 * load from `process.env`. Components should filter on `enabled` before
 * rendering links.
 *
 * Env var naming convention: `NEXT_PUBLIC_SOCIAL_<KEY>_ENABLED=true`
 */
export const SOCIAL_CHANNELS: SocialChannel[] = [
  {
    key: 'x',
    label: 'X',
    url: 'https://x.thepit.cloud',
    enabled: process.env.NEXT_PUBLIC_SOCIAL_X_ENABLED === 'true',
  },
  {
    key: 'reddit',
    label: 'Reddit',
    url: 'https://reddit.thepit.cloud',
    enabled: process.env.NEXT_PUBLIC_SOCIAL_REDDIT_ENABLED === 'true',
  },
  {
    key: 'discord',
    label: 'Discord',
    url: 'https://discord.thepit.cloud',
    enabled: process.env.NEXT_PUBLIC_SOCIAL_DISCORD_ENABLED === 'true',
  },
  {
    key: 'github',
    label: 'GitHub',
    url: 'https://github.com/rickhallett/thepit',
    enabled: process.env.NEXT_PUBLIC_SOCIAL_GITHUB_ENABLED === 'true',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/in/richardhallett86/',
    enabled: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_ENABLED === 'true',
  },
];

/** Convenience: only enabled channels, ready for iteration in UI. */
export const enabledSocialChannels = (): SocialChannel[] =>
  SOCIAL_CHANNELS.filter((ch) => ch.enabled);

// ---------------------------------------------------------------------------
// Share link builders
// ---------------------------------------------------------------------------

export interface ShareLinks {
  x: string;
  reddit: string;
  whatsapp: string;
  telegram: string;
  linkedin: string;
}

/**
 * Build platform share URLs for a given text payload and replay URL.
 * Returns all links regardless of channel enabled state — the UI layer
 * decides which to render based on `SOCIAL_CHANNELS`.
 *
 * @param text - Full share text (used for Reddit, WhatsApp, Telegram, LinkedIn)
 * @param replayUrl - Replay URL for the bout
 * @param xText - Optional shorter text for X/Twitter (280 char limit). Falls back to `text` if omitted.
 * @param sharerId - Optional Clerk user ID appended as `pit_sharer` for viral attribution.
 */
export function buildShareLinks(text: string, replayUrl: string, xText?: string, sharerId?: string | null): ShareLinks {
  // Append sharer attribution to the replay URL if a userId is provided.
  // This enables K-factor viral coefficient tracking (OCE-252).
  const attributedUrl = sharerId
    ? `${replayUrl}${replayUrl.includes('?') ? '&' : '?'}pit_sharer=${encodeURIComponent(sharerId)}`
    : replayUrl;

  // Replace the plain replayUrl inside text/xText with the attributed version
  // so ALL share channels (including X and WhatsApp) carry the pit_sharer param.
  // Without this, only channels using encodedUrl (Reddit, LinkedIn, Telegram)
  // would include attribution — X and WhatsApp embed the URL inline in the text.
  const attributedText = sharerId ? text.replaceAll(replayUrl, attributedUrl) : text;
  const attributedXText = xText
    ? (sharerId ? xText.replaceAll(replayUrl, attributedUrl) : xText)
    : attributedText;

  const encoded = encodeURIComponent(attributedText);
  const encodedUrl = encodeURIComponent(attributedUrl);
  const title = encodeURIComponent(`The Pit — AI agents argue. You judge.`);
  const xEncoded = encodeURIComponent(attributedXText);

  return {
    x: `https://twitter.com/intent/tweet?text=${xEncoded}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${title}`,
    whatsapp: `https://wa.me/?text=${encoded}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encoded}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };
}

/**
 * Compose the standard share text for a bout.
 * Centralises the format so all share surfaces produce consistent copy.
 */
export function buildShareText(
  headline: string,
  replayUrl: string,
): string {
  return [headline, '', replayUrl, '', `🔴 ${BRAND.hashtag}`].join('\n');
}
