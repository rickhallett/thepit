import { expect, test } from '@playwright/test';

const creditsEnabled = process.env.CREDITS_ENABLED === 'true';

test.skip(
  creditsEnabled,
  'Streaming e2e requires auth when credits are enabled.',
);

test('streams a bout with real text', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter' }).first().click();
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
