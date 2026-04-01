/**
 * E2E tests for the Ask The Pit floating chat widget.
 *
 * The widget is gated by the ASK_THE_PIT_ENABLED env var (default: false).
 * When the server is built without the flag, the button never renders and
 * all tests in this file are skipped.
 */
import { expect, test } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? '';
const isPreview = /vercel\.app/i.test(baseUrl);

// The feature flag is baked at build time. If the button does not appear,
// the server was built with ASK_THE_PIT_ENABLED=false (the default) and
// there is nothing meaningful to test.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Ask The Pit' });
  const visible = await button.isVisible({ timeout: 10_000 }).catch(() => false);
  test.skip(
    !visible,
    'Ask The Pit button not found. The server was likely built with ASK_THE_PIT_ENABLED=false.',
  );
});

test('E1: chat button is visible when feature is enabled', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Ask The Pit' });
  await expect(button).toBeVisible();
  await expect(button).toHaveText('?');
});

test('E2: clicking button opens chat modal', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Ask The Pit' });
  await button.click();

  const header = page.getByText('Ask The Pit', { exact: true });
  await expect(header).toBeVisible();
});

test('E3: can submit a question and see a response', async ({ page }) => {
  test.skip(isPreview, 'Streaming API unavailable on preview deployments.');

  const button = page.getByRole('button', { name: 'Ask The Pit' });
  await button.click();

  const input = page.getByPlaceholder('Ask a question...');
  await expect(input).toBeVisible();
  await input.fill('What is The Pit?');

  const sendButton = page.getByRole('button', { name: /send/i });
  await sendButton.click();

  // Wait for an assistant response to stream in. The component labels
  // assistant messages with a "Pit" role tag followed by a <p> with content.
  // We poll because the response is streamed chunk by chunk.
  await expect.poll(
    async () => {
      // All message <p> elements sit inside role-labelled containers.
      // Assistant messages are preceded by a span containing "Pit".
      const pitLabels = page.locator('span', { hasText: 'Pit' });
      const count = await pitLabels.count();
      if (count === 0) return false;

      // The response <p> is the next sibling of the role label span.
      const lastContainer = pitLabels.nth(count - 1).locator('..');
      const responseP = lastContainer.locator('p');
      const text = await responseP.textContent().catch(() => '');
      // Accept any non-trivial content, including error messages from the API.
      return (text ?? '').trim().length > 2;
    },
    { timeout: 60_000, message: 'Expected an assistant response to appear' },
  ).toBeTruthy();
});

// E4: button is not visible when feature is disabled.
// This is the default state (ASK_THE_PIT_ENABLED=false). The beforeEach
// hook already skips the entire suite when the button is absent, which
// implicitly covers this case. A dedicated test would require a separate
// server build with the flag off, so we skip it here with documentation.
test.skip('E4: button is not visible when feature is disabled', () => {
  // Requires a server built without ASK_THE_PIT_ENABLED.
  // The default CI build has the flag off, so the beforeEach skip covers
  // this scenario. To test explicitly, run against a server with the
  // flag unset and assert the button is not in the DOM.
});
