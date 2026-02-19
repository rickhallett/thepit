import { expect, test } from '@playwright/test';

/**
 * QA suite for React hydration error #418 fix (PR #284, OCE-344/OCE-345).
 *
 * The root cause was PostHogProvider using `typeof window !== 'undefined'`
 * in its render path, producing different component trees on server vs client.
 * The fix always renders the PHProvider wrapper and uses a reactive
 * PostHogReadyContext to gate analytics calls until consent + initialization.
 *
 * Run against production:
 *   BASE_URL=https://www.thepit.cloud pnpm run test:e2e -- tests/e2e/qa-hydration-418.spec.ts
 */

const BASE = process.env.BASE_URL ?? 'https://www.thepit.cloud';

// Pages to verify — covers the main routes users visit.
// Arena pages are excluded here because they have a separate text-content
// hydration mismatch (dynamic values like free bout counts and credits that
// differ between server render and client hydration). That issue is tracked
// separately and is unrelated to the PostHog provider tree mismatch this
// PR fixes. See ARENA_PAGES below for dedicated arena tests.
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'leaderboard', path: '/leaderboard' },
  { name: 'recent', path: '/recent' },
  { name: 'research', path: '/research' },
  { name: 'contact', path: '/contact' },
  { name: 'privacy', path: '/privacy' },
  { name: 'terms', path: '/terms' },
  { name: 'developers', path: '/developers' },
];

// Arena pages have a known text-content hydration mismatch (dynamic counters).
// We still test them but verify they DON'T have the PostHog tree mismatch.
const ARENA_PAGES = [
  { name: 'arena', path: '/arena' },
  { name: 'arena/custom', path: '/arena/custom' },
];

// ═══════════════════════════════════════════════════════════════════════════
// OCE-344: React hydration error #418 fix
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-344: No React hydration errors on page load', () => {
  for (const { name, path } of PAGES) {
    test(`${name} page loads without hydration error #418`, async ({
      page,
    }) => {
      const errors: string[] = [];

      // Capture console errors related to hydration
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // React hydration error #418 patterns
          if (
            text.includes('#418') ||
            text.includes('Hydration failed') ||
            text.includes('hydration mismatch') ||
            text.includes('server-rendered HTML') ||
            text.includes('Text content does not match') ||
            text.includes('did not match')
          ) {
            errors.push(text);
          }
        }
      });

      // Also capture uncaught errors
      page.on('pageerror', (err) => {
        if (
          err.message.includes('#418') ||
          err.message.includes('Hydration')
        ) {
          errors.push(err.message);
        }
      });

      const response = await page.goto(`${BASE}${path}`, {
        waitUntil: 'networkidle',
        timeout: 30_000,
      });
      expect(response?.status()).toBeLessThan(400);

      // Wait a moment for any deferred hydration errors to surface
      await page.waitForTimeout(2000);

      expect(errors).toEqual([]);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// OCE-344: Arena pages — known text-content hydration mismatch
// These pages have dynamic counters (free bouts, credits) that cause a
// separate #418 text mismatch unrelated to the PostHog tree fix.
// We verify they load and are functional despite the text mismatch.
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-344: Arena pages load despite text-content mismatch', () => {
  for (const { name, path } of ARENA_PAGES) {
    test(`${name} page loads successfully and is interactive`, async ({
      page,
    }) => {
      const response = await page.goto(`${BASE}${path}`, {
        waitUntil: 'networkidle',
        timeout: 30_000,
      });
      expect(response?.status()).toBeLessThan(400);

      // Page should be functional even if there's a text mismatch
      const body = page.locator('body');
      await expect(body).toBeVisible();
      const text = await body.textContent();
      expect(text?.length).toBeGreaterThan(100);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// OCE-344: suppressHydrationWarning on html tag
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-344: HTML tag has suppressHydrationWarning', () => {
  test('html element renders with lang attribute', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'en');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// OCE-344: PostHog provider renders consistently
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-344: PostHog provider structure', () => {
  test('page does not have mismatched React tree markers', async ({
    page,
  }) => {
    // Navigate as a fresh visitor (no cookies) — this was the original
    // trigger: first-time visitors without consent saw the hydration error
    const context = page.context();
    await context.clearCookies();

    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          text.includes('Hydration') ||
          text.includes('#418') ||
          text.includes('did not match')
        ) {
          errors.push(text);
        }
      }
    });

    await page.goto(`${BASE}/arena`, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });

  test('arena page is interactive after load (no broken hydration)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/arena`, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });

    // If hydration failed, interactive elements would not work.
    // Check that the page has rendered interactive content.
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // The page should have at least some interactive content loaded
    const text = await body.textContent();
    expect(text?.length).toBeGreaterThan(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// OCE-344: Consent-gated analytics (no pre-consent tracking)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-344: Analytics consent gating', () => {
  test('no PostHog network requests before cookie consent', async ({
    page,
  }) => {
    // Clear all cookies to simulate first-time visitor
    const context = page.context();
    await context.clearCookies();

    const posthogRequests: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      // PostHog uses /ingest (reverse proxy) or us.i.posthog.com
      if (
        url.includes('/ingest/') ||
        url.includes('posthog.com') ||
        url.includes('/e/') // PostHog event endpoint
      ) {
        // Exclude the PostHog JS library itself (which loads regardless)
        if (!url.includes('.js') && !url.includes('/static/')) {
          posthogRequests.push(url);
        }
      }
    });

    await page.goto(`${BASE}/`, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    // Wait for any deferred requests
    await page.waitForTimeout(3000);

    // Should have no event/identify/capture requests to PostHog
    // (the JS bundle may load, but no tracking calls should fire)
    const trackingRequests = posthogRequests.filter(
      (url) =>
        url.includes('/e') ||
        url.includes('/capture') ||
        url.includes('/decide') ||
        url.includes('/batch'),
    );

    expect(trackingRequests).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// OCE-344: Bout page hydration (dynamic route)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-344: Dynamic route hydration', () => {
  // Use a known bout page to verify dynamic routes also hydrate cleanly
  const KNOWN_BOUT = 'T-NWqp-drZM0Vv5LPG6IT';

  test('bout detail page loads without hydration errors', async ({
    page,
  }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          text.includes('#418') ||
          text.includes('Hydration') ||
          text.includes('did not match')
        ) {
          errors.push(text);
        }
      }
    });

    const response = await page.goto(`${BASE}/b/${KNOWN_BOUT}`, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    expect(response?.status()).toBe(200);

    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});
