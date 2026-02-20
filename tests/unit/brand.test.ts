import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('lib/brand', () => {
  // Reset modules between tests so env vars are re-evaluated.
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('BRAND constants', () => {
    it('exports core identity fields', async () => {
      const { BRAND } = await import('@/lib/brand');

      expect(BRAND.name).toBe('THE PIT');
      expect(BRAND.handle).toBe('@ThePitArena');
      expect(BRAND.hashtag).toBe('#ThePitArena');
      expect(BRAND.tagline).toBe('Trust infrastructure for AI agents.');
      expect(BRAND.url).toBe('https://thepit.cloud');
      expect(BRAND.github).toContain('github.com');
    });
  });

  describe('SOCIAL_CHANNELS', () => {
    it('defines all 5 channels', async () => {
      const { SOCIAL_CHANNELS } = await import('@/lib/brand');

      expect(SOCIAL_CHANNELS).toHaveLength(5);
      const keys = SOCIAL_CHANNELS.map((ch) => ch.key);
      expect(keys).toEqual(['x', 'reddit', 'discord', 'github', 'linkedin']);
    });

    it('all channels disabled by default (no env vars)', async () => {
      const { SOCIAL_CHANNELS } = await import('@/lib/brand');

      for (const ch of SOCIAL_CHANNELS) {
        expect(ch.enabled).toBe(false);
      }
    });

    it('all channels have valid https URLs', async () => {
      const { SOCIAL_CHANNELS } = await import('@/lib/brand');

      for (const ch of SOCIAL_CHANNELS) {
        expect(ch.url).toMatch(/^https:\/\//);
      }
    });
  });

  describe('enabledSocialChannels', () => {
    it('returns empty array when no channels enabled', async () => {
      const { enabledSocialChannels } = await import('@/lib/brand');
      expect(enabledSocialChannels()).toEqual([]);
    });

    it('returns only enabled channels based on env vars', async () => {
      vi.stubEnv('NEXT_PUBLIC_SOCIAL_X_ENABLED', 'true');
      vi.stubEnv('NEXT_PUBLIC_SOCIAL_DISCORD_ENABLED', 'true');

      const { enabledSocialChannels } = await import('@/lib/brand');
      const enabled = enabledSocialChannels();

      expect(enabled).toHaveLength(2);
      expect(enabled.map((ch) => ch.key)).toEqual(['x', 'discord']);
    });

    it('ignores non-true values', async () => {
      vi.stubEnv('NEXT_PUBLIC_SOCIAL_X_ENABLED', 'false');
      vi.stubEnv('NEXT_PUBLIC_SOCIAL_REDDIT_ENABLED', '1');
      vi.stubEnv('NEXT_PUBLIC_SOCIAL_DISCORD_ENABLED', 'yes');

      const { enabledSocialChannels } = await import('@/lib/brand');
      expect(enabledSocialChannels()).toEqual([]);
    });
  });

  describe('buildShareLinks', () => {
    it('returns all 5 platform share URLs', async () => {
      const { buildShareLinks } = await import('@/lib/brand');
      const links = buildShareLinks('Test bout', 'https://thepit.cloud/b/123');

      expect(links.x).toContain('twitter.com/intent/tweet');
      expect(links.reddit).toContain('reddit.com/submit');
      expect(links.whatsapp).toContain('wa.me');
      expect(links.telegram).toContain('t.me/share');
      expect(links.linkedin).toContain('linkedin.com/sharing');
    });

    it('encodes text and URL in share links', async () => {
      const { buildShareLinks } = await import('@/lib/brand');
      const text = 'Hello & goodbye <world>';
      const url = 'https://thepit.cloud/b/test?a=1';
      const links = buildShareLinks(text, url);

      // Text should be URI-encoded
      expect(links.x).toContain(encodeURIComponent(text));
      // URL should be URI-encoded in reddit, linkedin
      expect(links.reddit).toContain(encodeURIComponent(url));
      expect(links.linkedin).toContain(encodeURIComponent(url));
    });

    it('includes replay URL in telegram link', async () => {
      const { buildShareLinks } = await import('@/lib/brand');
      const url = 'https://thepit.cloud/b/abc';
      const links = buildShareLinks('test', url);

      expect(links.telegram).toContain(encodeURIComponent(url));
    });
  });

  describe('buildShareText', () => {
    it('composes headline, URL, and hashtag', async () => {
      const { buildShareText, BRAND } = await import('@/lib/brand');
      const text = buildShareText(
        'Epic roast battle',
        'https://thepit.cloud/b/123',
      );

      expect(text).toContain('Epic roast battle');
      expect(text).toContain('https://thepit.cloud/b/123');
      expect(text).toContain(BRAND.hashtag);
    });

    it('separates sections with blank lines', async () => {
      const { buildShareText } = await import('@/lib/brand');
      const text = buildShareText('Headline', 'https://example.com');
      const lines = text.split('\n');

      // Format: headline, blank, url, blank, hashtag
      expect(lines[0]).toBe('Headline');
      expect(lines[1]).toBe('');
      expect(lines[2]).toBe('https://example.com');
      expect(lines[3]).toBe('');
      expect(lines[4]).toMatch(/^🔴/);
    });
  });
});
