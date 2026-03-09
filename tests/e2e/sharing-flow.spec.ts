// E2E test stub for sharing flow.
// Playwright not yet installed — tests are skipped placeholders.
// Will be filled in when @playwright/test is added as a dependency.

export {};

const sharingTest = {
  describe: (_name: string, fn: () => void) => fn(),
  skip: (_name: string, _fn: () => Promise<void>) => {
    // Skipped test placeholder
  },
};

sharingTest.describe("Sharing flow", () => {
  sharingTest.skip("complete bout → get short link → navigate to /b/{slug} → see replay", async () => {
    // TODO: requires running dev server with test database
    // Will be filled in during integration testing
    //
    // Test plan:
    // 1. Start a bout via /bout/{new-nanoid}?presetId=...
    // 2. Wait for bout to complete ("Debate complete" text)
    // 3. Extract short link from share panel
    // 4. Navigate to /b/{slug}
    // 5. Assert data-testid="replay-page" is visible
    // 6. Assert data-testid="bout-hero" is visible
    // 7. Assert data-testid="hero-quote" contains text
    // 8. Assert transcript messages are rendered (data-testid="message-card")
  });

  sharingTest.skip("navigate to replay page → verify bout hero shows quote", async () => {
    // TODO: requires seeded test database with completed bout and reactions
    //
    // Test plan:
    // 1. Seed DB with completed bout + reactions on turn 2
    // 2. Create short link for bout
    // 3. Navigate to /b/{slug}
    // 4. Assert data-testid="bout-hero" is visible
    // 5. Assert data-testid="hero-quote" shows turn 2 content (most reacted)
  });

  sharingTest.skip("replay page renders full static transcript (not streaming)", async () => {
    // TODO: requires seeded test database with completed bout
    //
    // Test plan:
    // 1. Seed DB with completed bout (5 turns)
    // 2. Navigate to /b/{boutId}
    // 3. Assert all 5 message cards are visible immediately
    // 4. Assert no streaming indicator is present
    // 5. Assert "Debate complete" status text
  });

  sharingTest.skip("signed-out user sees CTA banner on replay page", async () => {
    // TODO: requires running dev server
    //
    // Test plan:
    // 1. Ensure not signed in (clear cookies)
    // 2. Navigate to /b/{boutId} (seeded completed bout)
    // 3. Assert "Create your own debate" heading is visible
    // 4. Assert "Start a Debate" link is visible and points to /arena
  });

  sharingTest.skip("signed-in user does not see CTA banner", async () => {
    // TODO: requires test user authentication
    //
    // Test plan:
    // 1. Sign in as test user
    // 2. Navigate to /b/{boutId}
    // 3. Assert "Create your own debate" is NOT visible
  });

  sharingTest.skip("short link resolves correctly", async () => {
    // TODO: requires seeded test database
    //
    // Test plan:
    // 1. Seed bout with known ID
    // 2. Create short link via API
    // 3. Navigate to /b/{slug}
    // 4. Assert page loads without redirect (URL stays as /b/{slug})
    // 5. Assert bout content matches seeded data
  });

  sharingTest.skip("direct bout ID resolves correctly", async () => {
    // TODO: requires seeded test database
    //
    // Test plan:
    // 1. Seed bout with 21-char ID
    // 2. Navigate to /b/{boutId} (21 chars)
    // 3. Assert page loads successfully
    // 4. Assert bout content matches seeded data
  });

  sharingTest.skip("invalid ID returns 404", async () => {
    // TODO: requires running dev server
    //
    // Test plan:
    // 1. Navigate to /b/invalid123
    // 2. Assert 404 page is shown
    // 3. Navigate to /b/nonexistent-21-char-id
    // 4. Assert 404 page is shown
  });
});
