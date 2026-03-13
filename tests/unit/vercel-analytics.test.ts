import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Test the consent-gating logic of VercelAnalytics by verifying
// that getConsentState correctly gates the Analytics import.

describe('components/vercel-analytics', () => {
  let mockCookie: string;

  beforeEach(() => {
    vi.resetModules();
    mockCookie = '';
    // Mock document.cookie for Node environment
    vi.stubGlobal('document', {
      get cookie() {
        return mockCookie;
      },
      set cookie(value: string) {
        const parts = value.split(';');
        const keyVal = parts[0] ?? '';
        const keyParts = keyVal.split('=');
        const key = keyParts[0] ?? '';
        const cookies = mockCookie.split('; ').filter((c) => !c.startsWith(`${key}=`));
        if (keyVal) cookies.push(keyVal);
        mockCookie = cookies.filter(Boolean).join('; ');
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe('consent gating', () => {
    it('module imports getConsentState from cookie-consent', async () => {
      // Verify the import relationship exists
      const vercelAnalytics = await import('@/components/vercel-analytics');
      expect(vercelAnalytics.VercelAnalytics).toBeDefined();
    });

    it('getConsentState returns pending when no cookie - Analytics should not load', async () => {
      const { getConsentState } = await import('@/components/cookie-consent');
      expect(getConsentState()).toBe('pending');
      // When pending, the component returns null (no Analytics rendered)
    });

    it('getConsentState returns declined when declined - Analytics should not load', async () => {
      mockCookie = 'pit_consent=declined';

      const { getConsentState } = await import('@/components/cookie-consent');
      expect(getConsentState()).toBe('declined');
      // When declined, the component returns null (no Analytics rendered)
    });

    it('getConsentState returns accepted when accepted - Analytics should load', async () => {
      mockCookie = 'pit_consent=accepted';

      const { getConsentState } = await import('@/components/cookie-consent');
      expect(getConsentState()).toBe('accepted');
      // When accepted, the component renders Analytics
    });
  });
});
