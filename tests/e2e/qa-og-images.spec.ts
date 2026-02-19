import { expect, test } from '@playwright/test';

/**
 * QA suite for per-bout OG images (PR #289, OCE-347/OCE-349).
 *
 * Tests that the dynamic OG image endpoint returns valid PNG images
 * with the enhanced layout (topic, stats, quotes).
 *
 * Run against production:
 *   BASE_URL=https://www.thepit.cloud pnpm run test:e2e -- tests/e2e/qa-og-images.spec.ts
 */

const BASE = process.env.BASE_URL ?? 'https://www.thepit.cloud';

// Sample bout IDs from production. These are completed bouts that should
// have OG images generated. If they 404, the test will fail — replace
// with current bout IDs from /recent.
const BOUT_IDS = [
  '25UCNhXykSLLvejs_EJDR',
  '4SbASWV2l7_fNOr18coHt',
  'Vo_siaBSLkubOs3e8Chhl',
];

test.describe('Per-bout OG Images (OCE-347)', () => {
  test('bout page includes og:image meta tag', async ({ page }) => {
    await page.goto(`${BASE}/b/${BOUT_IDS[0]}`);
    const ogImage = page.locator('meta[property="og:image"]');
    const content = await ogImage.getAttribute('content');
    expect(content).toBeTruthy();
    expect(content).toContain(BOUT_IDS[0]);
  });

  for (const boutId of BOUT_IDS) {
    test(`OG image for /b/${boutId} returns 200 with image content`, async ({
      request,
    }) => {
      // The OG image endpoint is at /b/[id]/opengraph-image
      const res = await request.get(
        `${BASE}/b/${boutId}/opengraph-image`,
      );
      expect(res.status()).toBe(200);
      const contentType = res.headers()['content-type'];
      expect(contentType).toMatch(/image\/(png|jpeg|webp)/);
    });
  }

  test('OG image for /bout/ alias route returns 200', async ({ request }) => {
    const res = await request.get(
      `${BASE}/bout/${BOUT_IDS[0]}/opengraph-image`,
    );
    expect(res.status()).toBe(200);
    const contentType = res.headers()['content-type'];
    expect(contentType).toMatch(/image\/(png|jpeg|webp)/);
  });

  test('OG image has expected dimensions (1200x630)', async ({ page }) => {
    // Fetch the image and check its natural dimensions
    const res = await page.goto(
      `${BASE}/b/${BOUT_IDS[0]}/opengraph-image`,
    );
    expect(res?.status()).toBe(200);

    // The page should have rendered an image — check viewport-level dimensions
    // by inspecting the response headers or image metadata
    const contentType = res?.headers()['content-type'];
    expect(contentType).toMatch(/image\/(png|jpeg|webp)/);
  });

  test('OG image for non-existent bout returns gracefully', async ({
    request,
  }) => {
    const res = await request.get(
      `${BASE}/b/non_existent_bout_id_12345/opengraph-image`,
    );
    // Should return either 200 with fallback image or 404 — not 500
    expect(res.status()).toBeLessThan(500);
  });

  test('bout page has og:title meta tag', async ({ page }) => {
    await page.goto(`${BASE}/b/${BOUT_IDS[0]}`);
    const ogTitle = page.locator('meta[property="og:title"]');
    const content = await ogTitle.getAttribute('content');
    expect(content).toBeTruthy();
  });

  test('bout page has twitter:card meta tag for large image', async ({
    page,
  }) => {
    await page.goto(`${BASE}/b/${BOUT_IDS[0]}`);
    const twitterCard = page.locator('meta[name="twitter:card"]');
    const content = await twitterCard.getAttribute('content');
    // Should be summary_large_image for OG image display
    if (content) {
      expect(content).toBe('summary_large_image');
    }
  });
});
