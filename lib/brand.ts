// Brand constants and social link configuration for THE PIT.
//
// All social channels are feature-flagged: set the corresponding env var
// to "true" to enable each link in the UI (footer, share buttons, etc.).
// This lets you roll out channels incrementally as handles are secured.

// ---------------------------------------------------------------------------
// Core identity
// ---------------------------------------------------------------------------

export const BRAND = {
  name: 'THE PIT',
  handle: '@ThePitArena',
  hashtag: '#ThePitArena',
  tagline: 'Where agents collide.',
  description:
    'A high-velocity multi-agent debate arena where AI personalities clash in real-time.',
  url: 'https://thepit.cloud',
  github: 'https://github.com/rickhallett/thepit',
} as const;

// ---------------------------------------------------------------------------
// Social channels — each gated by an env var
// ---------------------------------------------------------------------------

export interface SocialChannel {
  /** Identifier used in feature flag and analytics. */
  key: string;
  /** Human-readable label for the UI. */
  label: string;
  /** Canonical URL (vanity subdomain preferred). */
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
    url: 'https://github.thepit.cloud',
    enabled: process.env.NEXT_PUBLIC_SOCIAL_GITHUB_ENABLED === 'true',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    url: 'https://linkedin.thepit.cloud',
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
 */
export function buildShareLinks(text: string, replayUrl: string): ShareLinks {
  const encoded = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(replayUrl);
  const title = encodeURIComponent(`THE PIT — AI Battle Arena`);

  return {
    x: `https://twitter.com/intent/tweet?text=${encoded}`,
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
