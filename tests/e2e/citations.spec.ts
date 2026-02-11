import { expect, test } from '@playwright/test';

test.describe('Research citations page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/research/citations');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Research Foundations/);
  });

  test('all external arXiv links open in a new tab', async ({ page }) => {
    const arxivLinks = page.locator('a[href^="https://arxiv.org"]');
    const count = await arxivLinks.count();

    expect(count).toBeGreaterThanOrEqual(18);

    for (let i = 0; i < count; i++) {
      const link = arxivLinks.nth(i);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
      await expect(link).toHaveAttribute('rel', /noreferrer/);
    }
  });

  test('every arXiv link resolves to a valid paper (HTTP 200)', async ({
    request,
    page,
  }) => {
    const arxivLinks = page.locator(
      'a[href^="https://arxiv.org"][target="_blank"]',
    );
    const count = await arxivLinks.count();
    expect(count).toBeGreaterThanOrEqual(18);

    // Collect unique URLs to avoid duplicate requests
    const urls = new Set<string>();
    for (let i = 0; i < count; i++) {
      const href = await arxivLinks.nth(i).getAttribute('href');
      if (href) urls.add(href);
    }

    expect(urls.size).toBe(18);

    // HEAD requests to arXiv to confirm each paper exists.
    // Run in parallel batches to be respectful but fast.
    const results = await Promise.all(
      [...urls].map(async (url) => {
        const response = await request.head(url);
        return { url, status: response.status() };
      }),
    );

    for (const { url, status } of results) {
      expect(status, `Expected 200 for ${url}, got ${status}`).toBe(200);
    }
  });

  test('inline citation anchors link to existing reference IDs', async ({
    page,
  }) => {
    const inlineCiteLinks = page.locator('a[href^="#ref-"]');
    const count = await inlineCiteLinks.count();

    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const href = await inlineCiteLinks.nth(i).getAttribute('href');
      expect(href).toBeTruthy();

      // href is e.g. "#ref-1" — the target element should have id="ref-1"
      const targetId = href!.slice(1); // remove leading #
      const target = page.locator(`#${targetId}`);
      await expect(
        target,
        `Expected element with id="${targetId}" to exist`,
      ).toHaveCount(1);
    }
  });

  test('each reference entry has a matching inline citation', async ({
    page,
  }) => {
    // Every [id^="ref-"] in the reference list should be cited at least once
    // in the body via an a[href="#ref-N"] link.
    const refEntries = page.locator('[id^="ref-"]');
    const refCount = await refEntries.count();

    expect(refCount).toBe(18);

    for (let i = 0; i < refCount; i++) {
      const id = await refEntries.nth(i).getAttribute('id');
      expect(id).toBeTruthy();

      const citingLinks = page.locator(`a[href="#${id}"]`);
      const citeCount = await citingLinks.count();
      expect(
        citeCount,
        `Reference ${id} is never cited inline`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  test('internal navigation links point to valid routes', async ({
    page,
  }) => {
    // The page has links back to /research and /
    const researchLink = page.locator('a[href="/research"]');
    await expect(researchLink.first()).toBeVisible();

    const homeLink = page.locator('a[href="/"]');
    await expect(homeLink.first()).toBeVisible();
  });

  test('research parent page links to citations subpage', async ({
    page,
  }) => {
    await page.goto('/research');

    const citationsLink = page.locator('a[href="/research/citations"]');
    await expect(citationsLink).toBeVisible();
    await citationsLink.click();
    await expect(page).toHaveURL(/\/research\/citations/);
  });
});
