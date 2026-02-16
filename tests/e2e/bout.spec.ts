import { expect, test } from '@playwright/test';

const creditsEnabled = process.env.CREDITS_ENABLED === 'true';
const baseUrl = process.env.BASE_URL ?? '';

// Streaming requires authentication (PR #168). On preview deployments,
// Clerk's <SignedIn>/<SignedOut> components never hydrate because the
// preview domain isn't in Clerk's allowed origins. Skip entirely on
// preview URLs and when credits are enabled (which also requires auth).
const isPreview = /vercel\.app/i.test(baseUrl);

test.skip(
  creditsEnabled || isPreview,
  creditsEnabled
    ? 'Streaming e2e requires auth when credits are enabled.'
    : 'Bout streaming requires Clerk auth, which is unavailable on preview deployments.',
);

test('streams a bout with real text', async ({ page }) => {
  await page.goto('/arena');

  const enterButton = page.getByRole('button', { name: /enter/i }).first();
  await expect(enterButton).toBeVisible({ timeout: 30_000 });
  await enterButton.click();
  await expect(page).toHaveURL(/\/bout\//);

  const messageLocator = page.locator('article p');

  await expect.poll(
    async () => {
      const texts = await messageLocator.allTextContents();
      return texts.some((text) => {
        const trimmed = text.replace(/\s+/g, ' ').trim();
        return trimmed.length > 3 && trimmed !== '...';
      });
    },
    { timeout: 60_000 },
  ).toBeTruthy();
});
