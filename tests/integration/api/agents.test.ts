/**
 * agents.test.ts — agent API integration tests.
 *
 * Tests against a real database. Skips gracefully when DATABASE_URL is not set.
 * Auth mocking uses vi.mock for Clerk's requireAuth.
 *
 * @vitest-environment node
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi, Mock } from "vitest";
import { NextRequest } from "next/server";

const hasDb = !!process.env.DATABASE_URL;

// Mock Clerk auth at module level
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

describe.skipIf(!hasDb)("POST /api/agents (live database)", () => {
  let db: Awaited<typeof import("@/db")>["db"];
  let schema: Awaited<typeof import("@/db/schema")>;
  let eq: Awaited<typeof import("drizzle-orm")>["eq"];
  let POST: Awaited<typeof import("@/app/api/agents/route")>["POST"];
  let clerkAuth: Mock;
  let getAgentSnapshots: Awaited<typeof import("@/lib/agents/registry")>["getAgentSnapshots"];

  const testUserId = `test-agent-api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAgentIds: string[] = [];

  beforeAll(async () => {
    // Neon serverless driver needs WebSocket in Node.js.
    const { neonConfig } = await import("@neondatabase/serverless");
    const ws = await import("ws");
    neonConfig.webSocketConstructor = ws.default;

    const drizzleOrm = await import("drizzle-orm");
    eq = drizzleOrm.eq;
    schema = await import("@/db/schema");
    db = (await import("@/db")).db;

    // Create test user first (agents have FK to users)
    await db.insert(schema.users).values({
      id: testUserId,
      email: "agent-test@test.com",
    });

    // Import route handler after WebSocket is configured
    POST = (await import("@/app/api/agents/route")).POST;
    getAgentSnapshots = (await import("@/lib/agents/registry")).getAgentSnapshots;

    // Get the mocked auth function
    const clerk = await import("@clerk/nextjs/server");
    clerkAuth = clerk.auth as unknown as Mock;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    if (db && schema) {
      // Clean up created agents
      for (const agentId of createdAgentIds) {
        await db.delete(schema.agents).where(eq(schema.agents.id, agentId));
      }
      // Clean up test user
      await db.delete(schema.users).where(eq(schema.users.id, testUserId));
    }
  });

  it("returns 201 with agentId and promptHash for valid input", async () => {
    clerkAuth.mockResolvedValue({ userId: testUserId });

    const req = new NextRequest("http://localhost/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Agent" }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.agentId).toBeDefined();

    // Track for cleanup BEFORE assertions that might throw — prevents orphaned DB records
    createdAgentIds.push(body.agentId);

    expect(body.agentId).toHaveLength(21);
    expect(body.promptHash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("returns 401 when not authenticated", async () => {
    clerkAuth.mockResolvedValue({ userId: null });

    const req = new NextRequest("http://localhost/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Agent" }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 for empty name", async () => {
    clerkAuth.mockResolvedValue({ userId: testUserId });

    const req = new NextRequest("http://localhost/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for name exceeding 80 characters", async () => {
    clerkAuth.mockResolvedValue({ userId: testUserId });

    const req = new NextRequest("http://localhost/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "A".repeat(81) }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("created agent appears in getAgentSnapshots", async () => {
    clerkAuth.mockResolvedValue({ userId: testUserId });

    const req = new NextRequest("http://localhost/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Registry Test Agent",
        tone: "friendly",
        archetype: "helper",
      }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    createdAgentIds.push(body.agentId);

    // Verify it appears in registry
    const snapshots = await getAgentSnapshots();
    const found = snapshots.find((s) => s.id === body.agentId);

    expect(found).toBeDefined();
    expect(found?.name).toBe("Registry Test Agent");
    expect(found?.tone).toBe("friendly");
    expect(found?.archetype).toBe("helper");
    expect(found?.promptHash).toBe(body.promptHash);
  });
});

describe("POST /api/agents (no database)", () => {
  it("skips live tests when DATABASE_URL is not set", () => {
    expect(true).toBe(true);
  });
});
