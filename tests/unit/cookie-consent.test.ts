import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('components/cookie-consent', () => {
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
        // Simulate browser cookie behavior - append or update
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

  describe('getConsentState', () => {
    it('returns pending when no consent cookie exists', async () => {
      const { getConsentState } = await import('@/components/cookie-consent');
      expect(getConsentState()).toBe('pending');
    });

    it('returns accepted when pit_consent=accepted', async () => {
      mockCookie = 'pit_consent=accepted';

      const { getConsentState } = await import('@/components/cookie-consent');
      expect(getConsentState()).toBe('accepted');
    });

    it('returns declined when pit_consent=declined', async () => {
      mockCookie = 'pit_consent=declined';

      const { getConsentState } = await import('@/components/cookie-consent');
      expect(getConsentState()).toBe('declined');
    });

    it('returns pending for unknown cookie values', async () => {
      mockCookie = 'pit_consent=maybe';

      const { getConsentState } = await import('@/components/cookie-consent');
      expect(getConsentState()).toBe('pending');
    });

    it('handles multiple cookies correctly', async () => {
      mockCookie = 'other_cookie=value; pit_consent=accepted; another=test';

      const { getConsentState } = await import('@/components/cookie-consent');
      expect(getConsentState()).toBe('accepted');
    });
  });

  describe('CONSENT_COOKIE', () => {
    it('exports the cookie name constant', async () => {
      const { CONSENT_COOKIE } = await import('@/components/cookie-consent');
      expect(CONSENT_COOKIE).toBe('pit_consent');
    });
  });
});
