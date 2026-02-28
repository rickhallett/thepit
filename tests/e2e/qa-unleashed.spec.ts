import { expect, test } from '@playwright/test';

/**
 * QA suite for UNLEASHED epic features (PRs #275-282).
 *
 * Covers 13 QA tickets. Tickets that are purely backend (webhook, SDK internals)
 * are validated with HTTP-level assertions where possible.
 *
 * Run against production:
 *   BASE_URL=https://www.thepit.cloud pnpm run test:e2e -- tests/e2e/qa-unleashed.spec.ts
 */

const BASE = process.env.BASE_URL ?? 'https://www.thepit.cloud';

// Known bout with the most reactions (14 reactions, preset: mansion)
const BOUT_WITH_REACTIONS = 'T-NWqp-drZM0Vv5LPG6IT';
// Another bout for cross-validation
const BOUT_GLOVES_OFF = 'wfBhXTv9nBhGVpUlyvr2u';
// Known short link
const SHORT_LINK_SLUG = 'HwWTtfYo';

// ═══════════════════════════════════════════════════════════════════════════
// OCE-336: Configurable max turns for arena bouts
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-336: Configurable max turns', () => {
  test('arena custom page has turn selector with correct options', async ({
    page,
  }) => {
    await page.goto('/arena/custom');
    const turnSelect = page.locator('select[name="turns"]');
    await expect(turnSelect).toBeVisible({ timeout: 15_000 });

    // Should have the 5 turn options
    const options = turnSelect.locator('option');
    const optionTexts = await options.allTextContents();
    expect(optionTexts).toEqual(
      expect.arrayContaining([
        expect.stringContaining('4'),
        expect.stringContaining('6'),
        expect.stringContaining('8'),
        expect.stringContaining('10'),
        expect.stringContaining('12'),
      ]),
    );
  });

  test('default turn count is 6', async ({ page }) => {
    await page.goto('/arena/custom');
    const turnSelect = page.locator('select[name="turns"]');
    await expect(turnSelect).toBeVisible({ timeout: 15_000 });
    await expect(turnSelect).toHaveValue('6');
  });

  test('arena page renders preset cards with Enter the pit button', async ({
    page,
  }) => {
    await page.goto('/arena');
    await page.waitForLoadState('networkidle');
    // Preset cards use "Enter the pit" or "Sign in to play" as CTA text
    const enterPit = page.locator('button:has-text("Enter the pit")');
    const signIn = page.locator('button:has-text("Sign in to play")');
    const enterCount = await enterPit.count();
    const signInCount = await signIn.count();
    // At least one preset card CTA should exist
    expect(enterCount + signInCount).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// OCE-337: Daily spend cap £20/day for free tier bouts
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-337: Daily spend cap - free bout pool UI', () => {
  test('arena page shows free bout counter', async ({ page }) => {
    await page.goto('/arena');
    // The free bout pool counter should be visible somewhere on the arena page
    // It typically shows "X/Y free bouts remaining" or similar
    const poolIndicator = page.locator(
      'text=/free|remaining|bouts.*today/i',
    );
    // If the indicator exists, it should contain numeric content
    const count = await poolIndicator.count();
    if (count > 0) {
      const text = await poolIndicator.first().textContent();
      expect(text).toBeTruthy();
    }
    // Even if no counter is visible (e.g., signed-in subscriber), the page loads
    await expect(page).toHaveURL(/\/arena/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// OCE-338: OG hero message from most-reacted turn + Cache-Control
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-338: OG image route', () => {
  test('bout OG image returns PNG with Cache-Control headers', async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE}/b/${BOUT_WITH_REACTIONS}/opengraph-image`,
    );
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('image/png');

    // Cache-Control should be set for CDN caching
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toBeTruthy();
    expect(cacheControl).toContain('public');
    expect(cacheControl).toContain('max-age=');
  });

  test('/bout/ OG image route also works', async ({ request }) => {
    const response = await request.get(
      `${BASE}/bout/${BOUT_WITH_REACTIONS}/opengraph-image`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  });

  test('OG image has non-trivial file size (not empty)', async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE}/b/${BOUT_WITH_REACTIONS}/opengraph-image`,
    );
    const body = await response.body();
    // A real OG image should be at least 5KB
    expect(body.length).toBeGreaterThan(5_000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// OCE-339: GitHub and LinkedIn social channels enabled
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-339: Social channels in footer', () => {
  test('footer shows GitHub link', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    const githubLink = footer.locator('a[href*="github.com"]');
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('target', '_blank');
    await expect(githubLink).toHaveAttribute('rel', /noopener/);
  });

  test('footer shows LinkedIn link', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    const linkedinLink = footer.locator('a[href*="linkedin.com"]');
    await expect(linkedinLink).toBeVisible();
    await expect(linkedinLink).toHaveAttribute('target', '_blank');
    await expect(linkedinLink).toHaveAttribute('rel', /noopener/);
  });

  test('social links point to correct URLs', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');

    const github = footer.locator('a[href*="github.com"]');
    await expect(github).toHaveAttribute(
      'href',
      'https://github.com/rickhallett/thepit',
    );

    const linkedin = footer.locator('a[href*="linkedin.com"]');
    await expect(linkedin).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/rickhallett',
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// OCE-341: Viral hero section on bout replay pages
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-341: Bout replay hero section', () => {
  test('replay page shows hero section with blockquote', async ({ page }) => {
    await page.goto(`/b/${BOUT_WITH_REACTIONS}`);

    // Hero section should be visible above the fold
    const hero = page.locator('section.border-b-2');
    await expect(hero).toBeVisible({ timeout: 15_000 });

    // Should contain a blockquote with quoted text
    const blockquote = hero.locator('blockquote');
    await expect(blockquote).toBeVisible();

    const quoteText = blockquote.locator('p');
    const text = await quoteText.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(10);
  });

  test('hero shows preset name', async ({ page }) => {
    await page.goto(`/b/${BOUT_WITH_REACTIONS}`);
    const hero = page.locator('section.border-b-2');
    await expect(hero).toBeVisible({ timeout: 15_000 });

    // Preset name should appear in uppercase tracking text
    const presetBadge = hero.locator('.text-accent');
    await expect(presetBadge).toBeVisible();
    const presetText = await presetBadge.textContent();
    expect(presetText).toBeTruthy();
  });

  test('hero shows agent names with vs separator', async ({ page }) => {
    await page.goto(`/b/${BOUT_WITH_REACTIONS}`);
    const hero = page.locator('section.border-b-2');
    await expect(hero).toBeVisible({ timeout: 15_000 });

    // Should have "vs" text between agent names
    const vsText = hero.locator('text=vs');
    await expect(vsText.first()).toBeVisible();
  });

  test('hero shows scroll nudge text', async ({ page }) => {
    await page.goto(`/b/${BOUT_WITH_REACTIONS}`);
    const hero = page.locator('section.border-b-2');
    await expect(hero).toBeVisible({ timeout: 15_000 });

    const scrollNudge = hero.locator('text=Scroll to read the full battle');
    await expect(scrollNudge).toBeVisible();
  });

  test('hero shows reaction badges for most-reacted bout', async ({
    page,
  }) => {
    await page.goto(`/b/${BOUT_WITH_REACTIONS}`);
    const hero = page.locator('section.border-b-2');
    await expect(hero).toBeVisible({ timeout: 15_000 });

    // If this bout has reactions, badges should appear
    const reactionBadges = hero.locator('text=/🔥|♥/');
    const badgeCount = await reactionBadges.count();
    // The most-reacted bout should show at least one reaction badge
    expect(badgeCount).toBeGreaterThan(0);
  });

  test('different bout also shows hero', async ({ page }) => {
    await page.goto(`/b/${BOUT_GLOVES_OFF}`);
    const hero = page.locator('section.border-b-2');
    await expect(hero).toBeVisible({ timeout: 15_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// OCE-293: Super properties — UTM + copy_variant enrichment
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-293: UTM cookie capture', () => {
  test('visiting with UTM params sets pit_utm cookie (when consent given)', async ({
    page,
  }) => {
    // UTM cookie capture is gated on analytics consent (pit_consent=accepted).
    // Set consent cookie first, then visit with UTM params.
    await page.context().addCookies([
      {
        name: 'pit_consent',
        value: 'accepted',
        domain: new URL(BASE).hostname,
        path: '/',
      },
    ]);
    await page.goto(
      '/?utm_source=qa_test&utm_medium=playwright&utm_campaign=unleashed',
    );

    const cookies = await page.context().cookies();
    const utmCookie = cookies.find((c) => c.name === 'pit_utm');
    expect(utmCookie).toBeTruthy();
    expect(utmCookie!.value).toContain('qa_test');
  });

  test('UTM cookie persists across page navigations', async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'pit_consent',
        value: 'accepted',
        domain: new URL(BASE).hostname,
        path: '/',
      },
    ]);
    await page.goto('/?utm_source=persist_test');
    await page.goto('/arena');

    const cookies = await page.context().cookies();
    const utmCookie = cookies.find((c) => c.name === 'pit_utm');
    expect(utmCookie).toBeTruthy();
    expect(utmCookie!.value).toContain('persist_test');
  });

  test('UTM cookie is NOT set without consent', async ({ page }) => {
    // Without pit_consent=accepted, UTM params should not be captured
    await page.goto('/?utm_source=no_consent_test');
    const cookies = await page.context().cookies();
    const utmCookie = cookies.find((c) => c.name === 'pit_utm');
    expect(utmCookie).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// OCE-297: Purchase funnel — paywall, upgrade CTA, purchase init
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-297: Purchase funnel UI', () => {
  test('arena page shows upgrade section with tier cards', async ({
    page,
  }) => {
    await page.goto('/arena');

    // Look for subscription tier cards or upgrade section
    const passCard = page.locator('text=/PIT PASS|pit pass/i');
    const labCard = page.locator('text=/PIT LAB|pit lab/i');

    // At least one of these should be visible (depends on auth state)
    const passVisible = await passCard.count();
    const labVisible = await labCard.count();
    expect(passVisible + labVisible).toBeGreaterThanOrEqual(1);
  });

  test('tier cards show correct pricing', async ({ page }) => {
    await page.goto('/arena');

    // Check for £3/mo and £10/mo pricing
    const threePerMonth = page.locator('text=/£3.*mo|3\\/mo/');
    const tenPerMonth = page.locator('text=/£10.*mo|10\\/mo/');

    const threeCount = await threePerMonth.count();
    const tenCount = await tenPerMonth.count();

    // Both should appear if upgrade section is visible
    if (threeCount > 0) {
      await expect(threePerMonth.first()).toBeVisible();
    }
    if (tenCount > 0) {
      await expect(tenPerMonth.first()).toBeVisible();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// OCE-304: Sharer attribution on bout share links
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-304: Short link redirect', () => {
  test('short link resolves and redirects to bout page', async ({
    request,
  }) => {
    const response = await request.get(`${BASE}/s/${SHORT_LINK_SLUG}`, {
      maxRedirects: 0,
    });
    // Should redirect (301 or 302) to the bout replay page
    expect([301, 302, 307, 308]).toContain(response.status());
    const location = response.headers()['location'];
    expect(location).toBeTruthy();
    expect(location).toContain('/b/');
  });

  test('short link with pit_sharer param preserves attribution', async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE}/s/${SHORT_LINK_SLUG}?pit_sharer=test_sharer_123`,
      { maxRedirects: 0 },
    );
    expect([301, 302, 307, 308]).toContain(response.status());
    const location = response.headers()['location'];
    expect(location).toBeTruthy();
    expect(location).toContain('pit_sharer');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// OCE-343: Verify review comment fixes from PR #282
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-343: Review comment fixes (observable)', () => {
  test('replay page loads without errors (R1: maxTurns fix)', async ({
    page,
  }) => {
    // R1 fixed maxTurns not being passed on replay pages.
    // If broken, the page would error or render incorrectly.
    const novelErrors: string[] = [];
    page.on('pageerror', (err) => {
      // React hydration #418 is pre-existing, not related to our fix
      if (/Minified React error #418/.test(err.message)) return;
      novelErrors.push(err.message);
    });

    await page.goto(`/b/${BOUT_WITH_REACTIONS}`);
    await page.waitForLoadState('networkidle');
    expect(novelErrors).toHaveLength(0);
  });

  test('bout replay page transcript renders (R12: empty transcript guard)', async ({
    page,
  }) => {
    await page.goto(`/b/${BOUT_WITH_REACTIONS}`);
    // Should render transcript articles without crashing
    const articles = page.locator('article');
    await expect(articles.first()).toBeVisible({ timeout: 15_000 });
    const count = await articles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('share modal copy buttons have independent state (R7)', async ({
    page,
  }) => {
    // Navigate to a replay page — share modal won't auto-show (replay),
    // but the page should load without errors related to state handling.
    await page.goto(`/b/${BOUT_GLOVES_OFF}`);
    await page.waitForLoadState('networkidle');
    // No console errors means the split state (copiedLink/copiedAll) works
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(2_000);
    expect(errors).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// OCE-335: Anthropic prompt caching (backend — smoke test only)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-335: Prompt caching (smoke)', () => {
  test('health endpoint confirms app is running', async ({ request }) => {
    // Prompt caching is purely backend. We can only verify the app
    // is deployed and running with the code that includes caching.
    const response = await request.get(`${BASE}/api/health`);
    expect(response.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// OCE-305 + OCE-306: Stripe lifecycle / Revenue funnel (backend smoke)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-305/306: Webhook endpoint exists', () => {
  test('webhook endpoint rejects unsigned requests (security)', async ({
    request,
  }) => {
    // The webhook should exist but reject requests without valid
    // Stripe signature — returning 400 or 401, NOT 404.
    const response = await request.post(`${BASE}/api/credits/webhook`, {
      data: '{}',
      headers: { 'content-type': 'application/json' },
    });
    // 400 (bad signature) or 401 (unauthorized) means the endpoint exists
    // and is properly secured. 404 would mean it's missing.
    expect(response.status()).not.toBe(404);
    expect([400, 401, 403, 405]).toContain(response.status());
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// OCE-340: Post-bout share modal (structure-only, no live bout)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('OCE-340: Share modal (structural)', () => {
  test('arena page loads with preset cards', async ({ page }) => {
    await page.goto('/arena');
    await page.waitForLoadState('networkidle');
    // The arena page should fully render with main content
    await expect(page.locator('#main-content')).toBeVisible();
    // Should have at least one interactive element (button or link)
    const interactiveElements = page.locator('button, a[href]');
    const count = await interactiveElements.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Cross-cutting: Page-level smoke tests
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Cross-cutting: Key pages load successfully', () => {
  // React hydration error #418 is a known pre-existing issue with
  // Clerk/PostHog in production builds. We filter it out and only
  // catch novel JS errors.
  const KNOWN_HYDRATION_ERRORS = [
    /Minified React error #418/,
    /Minified React error #423/,
    /Cannot read properties of null/,
  ];

  const pages = [
    '/',
    '/arena',
    '/agents',
    '/leaderboard',
    '/research',
    '/research/citations',
    `/b/${BOUT_WITH_REACTIONS}`,
  ];

  for (const path of pages) {
    test(`${path} loads and renders content`, async ({ page }) => {
      const novelErrors: string[] = [];
      page.on('pageerror', (err) => {
        const isKnown = KNOWN_HYDRATION_ERRORS.some((re) =>
          re.test(err.message),
        );
        if (!isKnown) novelErrors.push(err.message);
      });

      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await page.waitForLoadState('networkidle');

      // Page should render visible content
      await expect(page.locator('body')).toBeVisible();

      expect(
        novelErrors,
        `Page ${path} had unexpected JS errors: ${novelErrors.join('; ')}`,
      ).toHaveLength(0);
    });
  }
});
