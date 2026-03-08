// E2E test stub for bout flow.
// Playwright not yet installed — tests are skipped placeholders.
// Will be filled in when @playwright/test is added as a dependency.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const test = {
  describe: (_name: string, fn: () => void) => fn(),
  skip: (_name: string, _fn: () => Promise<void>) => {
    // Skipped test placeholder
  },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const expect = (_value: unknown) => ({
  toBe: (_expected: unknown) => true,
});

test.describe("Bout viewer", () => {
  test.skip("navigate to /bout/{id} → see streaming messages → see completion", async () => {
    // TODO: requires running dev server with test database
    // Will be filled in during integration testing
    //
    // Test plan:
    // 1. Navigate to /bout/{new-nanoid}
    // 2. Trigger bout start (either via autoStart prop or preset selection)
    // 3. Assert messages appear with data-testid="message-card"
    // 4. Assert streaming indicator visible during stream
    // 5. Wait for "Debate complete" text
    // 6. Assert share line appears
  });

  test.skip("load completed bout → render static transcript", async () => {
    // TODO: requires seeded test database with completed bout
    //
    // Test plan:
    // 1. Seed DB with completed bout
    // 2. Navigate to /bout/{seeded-id}
    // 3. Assert messages render immediately (no streaming indicator)
    // 4. Assert "Debate complete" status
    // 5. Assert share line visible
  });

  test.skip("load error bout → show error state", async () => {
    // TODO: requires seeded test database with error bout
    //
    // Test plan:
    // 1. Seed DB with error status bout
    // 2. Navigate to /bout/{error-id}
    // 3. Assert error message visible
  });
});
