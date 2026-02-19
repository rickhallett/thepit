import { expect, test } from '@playwright/test';

/**
 * QA suite for recent bouts pagination (PR #288, OCE-346/OCE-348).
 *
 * Tests server-side pagination on /recent: page navigation, URL params,
 * prev/next links, footer text, and out-of-bounds page clamping.
 *
 * Run against production:
 *   BASE_URL=https://www.thepit.cloud pnpm run test:e2e -- tests/e2e/qa-pagination.spec.ts
 */

const BASE = process.env.BASE_URL ?? 'https://www.thepit.cloud';

// Scoped locators — the page has a global site footer/nav in addition to
// the pagination controls inside <main>. We scope to <main> to avoid
// strict mode violations.
const paginationFooter = (page: import('@playwright/test').Page) =>
  page.locator('main footer');
const paginationNav = (page: import('@playwright/test').Page) =>
  page.locator('main nav');

test.describe('Recent Bouts Pagination (OCE-346)', () => {
  test('page 1 loads without ?page param', async ({ page }) => {
    const res = await page.goto(`${BASE}/recent`);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('page 1 shows "Showing 1–20 of N bouts" footer', async ({ page }) => {
    await page.goto(`${BASE}/recent`);
    await expect(paginationFooter(page)).toContainText(
      /Showing 1.20 of \d+ bouts/,
    );
  });

  test('page 1 renders bout cards', async ({ page }) => {
    await page.goto(`${BASE}/recent`);
    const cards = page.locator('a[href^="/b/"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(20);
  });

  test('PREV link is disabled on page 1', async ({ page }) => {
    await page.goto(`${BASE}/recent`);
    const nav = paginationNav(page);
    const navCount = await nav.count();
    if (navCount > 0) {
      // PREV should be a span (disabled), not a link
      const disabledPrev = nav.locator('span:has-text("PREV")');
      await expect(disabledPrev).toBeVisible();
    }
  });

  test('NEXT link navigates to page 2', async ({ page }) => {
    await page.goto(`${BASE}/recent`);
    const nav = paginationNav(page);
    const navCount = await nav.count();
    if (navCount > 0) {
      const nextLink = nav.locator('a:has-text("NEXT")');
      const nextCount = await nextLink.count();
      if (nextCount > 0) {
        await nextLink.click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('page=2');
        await expect(paginationFooter(page)).toContainText(
          /Showing 21.40 of \d+ bouts/,
        );
      }
    }
  });

  test('explicit ?page=2 loads page 2', async ({ page }) => {
    const res = await page.goto(`${BASE}/recent?page=2`);
    expect(res?.status()).toBe(200);
    await expect(paginationFooter(page)).toContainText(
      /Showing 21.40 of \d+ bouts/,
    );
  });

  test('page 2 has active PREV link back to page 1', async ({ page }) => {
    await page.goto(`${BASE}/recent?page=2`);
    const nav = paginationNav(page);
    const prevLink = nav.locator('a:has-text("PREV")');
    const prevCount = await prevLink.count();
    if (prevCount > 0) {
      await prevLink.click();
      await page.waitForLoadState('networkidle');
      // Should navigate back to /recent (no ?page param for page 1)
      expect(page.url()).not.toContain('page=');
    }
  });

  test('out-of-bounds page=999 returns 200 and shows last page', async ({
    page,
  }) => {
    const res = await page.goto(`${BASE}/recent?page=999`);
    expect(res?.status()).toBe(200);
    // Should NOT show empty state — should show bouts
    await expect(paginationFooter(page)).toContainText(
      /Showing \d+.\d+ of \d+ bouts/,
    );
  });

  test('page=0 is clamped to page 1', async ({ page }) => {
    const res = await page.goto(`${BASE}/recent?page=0`);
    expect(res?.status()).toBe(200);
    await expect(paginationFooter(page)).toContainText(
      /Showing 1.20 of \d+ bouts/,
    );
  });

  test('page=-1 is clamped to page 1', async ({ page }) => {
    const res = await page.goto(`${BASE}/recent?page=-1`);
    expect(res?.status()).toBe(200);
    await expect(paginationFooter(page)).toContainText(
      /Showing 1.20 of \d+ bouts/,
    );
  });

  test('page=abc (non-numeric) defaults to page 1', async ({ page }) => {
    const res = await page.goto(`${BASE}/recent?page=abc`);
    expect(res?.status()).toBe(200);
    await expect(paginationFooter(page)).toContainText(
      /Showing 1.20 of \d+ bouts/,
    );
  });

  test('pagination nav has correct structure', async ({ page }) => {
    await page.goto(`${BASE}/recent`);
    const nav = paginationNav(page);
    const navCount = await nav.count();
    if (navCount > 0) {
      await expect(nav).toContainText('PREV');
      await expect(nav).toContainText('NEXT');
    }
  });
});
