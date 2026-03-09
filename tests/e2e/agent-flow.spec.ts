// E2E test stub for agent flow.
// Playwright not yet installed — tests are skipped placeholders.
// Will be filled in when @playwright/test is added as a dependency.

// Unique names to avoid collision with bout-flow.spec.ts
const agentTest = {
  describe: (_name: string, fn: () => void) => fn(),
  skip: (_name: string, _fn: () => Promise<void>) => {
    // Skipped test placeholder
  },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const agentExpect = (_value: unknown) => ({
  toBe: (_expected: unknown) => true,
  toBeVisible: () => true,
  toHaveLength: (_expected: number) => true,
  toContainText: (_expected: string) => true,
});

agentTest.describe("Agents catalog", () => {
  agentTest.skip("navigate to /agents → see agent grid", async () => {
    // TODO: requires running dev server
    //
    // Test plan:
    // 1. Navigate to /agents
    // 2. Verify page title "Agents" is visible
    // 3. Verify agent cards are visible (data-testid="agent-card")
    // 4. Verify search input is present (data-testid="agent-search")
  });

  agentTest.skip("search for agent → results filter", async () => {
    // TODO: requires running dev server with seeded agents
    //
    // Test plan:
    // 1. Navigate to /agents
    // 2. Type search term in search input (data-testid="agent-search")
    // 3. Verify agent cards filter to match search term
    // 4. Clear search → all agents visible again
  });

  agentTest.skip("click agent card → navigate to detail page", async () => {
    // TODO: requires running dev server with seeded agents
    //
    // Test plan:
    // 1. Navigate to /agents
    // 2. Click first agent card (data-testid="agent-card")
    // 3. Verify URL changes to /agents/{id}
    // 4. Verify agent name is visible (data-testid="agent-name")
  });
});

agentTest.describe("Agent detail page", () => {
  agentTest.skip("navigate to /agents/{id} → see agent name and prompt hash", async () => {
    // TODO: requires seeded test database with agent
    //
    // Test plan:
    // 1. Seed DB with test agent
    // 2. Navigate to /agents/{seeded-id}
    // 3. Verify agent name visible (data-testid="agent-name")
    // 4. Verify prompt hash visible (data-testid="agent-prompt-hash")
    // 5. Verify collapsible system prompt section works
  });

  agentTest.skip("navigate to non-existent agent → 404", async () => {
    // TODO: requires running dev server
    //
    // Test plan:
    // 1. Navigate to /agents/nonexistent-id-12345
    // 2. Verify 404 page is shown
  });
});

agentTest.describe("Agent creation", () => {
  agentTest.skip("unauthenticated user → see sign-in prompt", async () => {
    // TODO: requires running dev server
    //
    // Test plan:
    // 1. Navigate to /agents/new (not signed in)
    // 2. Verify "Sign in" link is visible
    // 3. Verify AgentBuilder form is NOT visible
  });

  agentTest.skip("authenticated user → fill form → submit → redirect to detail page", async () => {
    // TODO: requires running dev server with test authentication
    //
    // Test plan:
    // 1. Sign in as test user
    // 2. Navigate to /agents/new
    // 3. Fill in name field (data-testid="agent-builder-name")
    // 4. Fill in archetype, tone, other optional fields
    // 5. Click submit button (data-testid="agent-builder-submit")
    // 6. Verify redirect to /agents/{new-id}
    // 7. Verify agent name visible on detail page
    // 8. Verify prompt hash visible
  });

  agentTest.skip("submit without name → show error", async () => {
    // TODO: requires running dev server with test authentication
    //
    // Test plan:
    // 1. Sign in as test user
    // 2. Navigate to /agents/new
    // 3. Click submit without filling name
    // 4. Verify error message is visible
  });
});

agentTest.describe("Full agent flow", () => {
  agentTest.skip("create agent → find in catalog → view detail", async () => {
    // TODO: requires full e2e setup with auth
    //
    // Test plan:
    // 1. Sign in as test user
    // 2. Navigate to /agents/new
    // 3. Create agent with unique name
    // 4. Verify redirect to /agents/{id}
    // 5. Navigate to /agents
    // 6. Search for the created agent name
    // 7. Verify agent card appears in results
    // 8. Click agent card
    // 9. Verify detail page shows correct info
  });
});
