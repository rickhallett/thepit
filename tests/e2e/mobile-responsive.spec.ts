import { expect, test } from '@playwright/test';

/**
 * Mobile responsive layout tests.
 *
 * Verifies that key pages render without horizontal overflow on an
 * iPhone 15-sized viewport (393×852) and that the mobile hamburger
 * navigation works correctly.
 *
 * These tests are intentionally lightweight — no auth, no streaming,
 * no API calls — so they run fast even in CI.
 */

// iPhone 15 logical viewport
test.use({ viewport: { width: 393, height: 852 } });

/** Helper: assert a page has no horizontal overflow (scrollWidth <= clientWidth). */
async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return { scrollWidth, clientWidth };
  });
  expect(
    overflow.scrollWidth,
    `Page overflows horizontally: scrollWidth ${overflow.scrollWidth}px > clientWidth ${overflow.clientWidth}px`,
  ).toBeLessThanOrEqual(overflow.clientWidth);
}

// ── Fix 1: Agents page ───────────────────────────────────────────────

test.describe('Agents page (mobile)', () => {
  test('no horizontal overflow', async ({ page }) => {
    await page.goto('/agents');
    await assertNoHorizontalOverflow(page);
  });

  test('filter inputs are within viewport bounds', async ({ page }) => {
    await page.goto('/agents');
    const searchInput = page.locator('input[placeholder="Agent, preset, id"]');
    await expect(searchInput).toBeVisible();

    const box = await searchInput.boundingBox();
    expect(box).toBeTruthy();
    // Input should not extend past the right edge of the viewport
    expect(box!.x + box!.width).toBeLessThanOrEqual(393);
  });
});

// ── Fix 2: Site header hamburger menu ────────────────────────────────

test.describe('Site header (mobile)', () => {
  test('hamburger button is visible, nav pills are hidden', async ({
    page,
  }) => {
    await page.goto('/');

    const hamburger = page.getByLabel(/open menu/i);
    await expect(hamburger).toBeVisible();

    // Desktop nav pills should be hidden on mobile
    const desktopNav = page.locator('header nav.hidden');
    await expect(desktopNav).toBeHidden();
  });

  test('clicking hamburger opens mobile nav with all links', async ({
    page,
  }) => {
    await page.goto('/');

    const hamburger = page.getByLabel(/open menu/i);
    await hamburger.click();

    // Mobile nav drawer should now be visible
    const mobileNav = page.locator('header nav.md\\:hidden');
    await expect(mobileNav).toBeVisible();

    // All 7 navigation links should be present
    const links = mobileNav.locator('a');
    await expect(links).toHaveCount(7);
  });

  test('clicking a nav link closes the menu and navigates', async ({
    page,
  }) => {
    await page.goto('/');

    const hamburger = page.getByLabel(/open menu/i);
    await hamburger.click();

    const mobileNav = page.locator('header nav.md\\:hidden');
    await expect(mobileNav).toBeVisible();

    // Click the "Arena" link
    await mobileNav.locator('a', { hasText: 'Arena' }).click();

    await expect(page).toHaveURL(/\/arena/);
    // Menu should be closed after navigation
    await expect(mobileNav).toBeHidden();
  });

  test('hamburger toggles to close icon when open', async ({ page }) => {
    await page.goto('/');

    const hamburger = page.getByLabel(/open menu/i);
    await hamburger.click();

    // After opening, the button label should change to "Close menu"
    const closeButton = page.getByLabel(/close menu/i);
    await expect(closeButton).toBeVisible();
  });
});

// ── Fix 3: Leaderboard page ─────────────────────────────────────────

test.describe('Leaderboard page (mobile)', () => {
  test('no horizontal overflow at page level', async ({ page }) => {
    await page.goto('/leaderboard');
    await assertNoHorizontalOverflow(page);
  });

  test('scroll hint gradient is visible when table overflows', async ({
    page,
  }) => {
    await page.goto('/leaderboard');
    // The gradient overlay should be present on mobile (md:hidden means visible below md)
    const gradient = page.locator(
      'div.pointer-events-none.bg-gradient-to-l',
    );
    // The gradient may not exist if there are no leaderboard entries.
    // If it exists, it should be visible.
    const count = await gradient.count();
    if (count > 0) {
      await expect(gradient.first()).toBeVisible();
    }
  });
});

// ── Fix 4: Arena page ───────────────────────────────────────────────

test.describe('Arena page (mobile)', () => {
  test('no horizontal overflow', async ({ page }) => {
    await page.goto('/arena');
    await assertNoHorizontalOverflow(page);
  });
});

// ── Landing page (regression guard) ─────────────────────────────────

test.describe('Landing page (mobile)', () => {
  test('no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await assertNoHorizontalOverflow(page);
  });
});
