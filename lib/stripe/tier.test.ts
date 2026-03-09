/**
 * tier.test.ts — Unit tests for tier configuration and resolution.
 *
 * Tests split into:
 * - Pure tests for TIER_CONFIG constants (no mocks)
 * - Mocked tests for resolveTierFromPriceId (mock env)
 * - Live DB tests for getUserTier (skip when no DATABASE_URL)
 *
 * @vitest-environment node
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANONYMOUS_RATE_LIMIT,
  getRateLimitConfigForTier,
  TIER_CONFIG,
  UserTier,
} from "./tier";

// ── TIER_CONFIG constants ────────────────────────────────

describe("TIER_CONFIG", () => {
  it("has entries for free, pass, and lab", () => {
    expect(TIER_CONFIG.free).toBeDefined();
    expect(TIER_CONFIG.pass).toBeDefined();
    expect(TIER_CONFIG.lab).toBeDefined();
  });

  describe("free tier", () => {
    const config = TIER_CONFIG.free;

    it("has 5 requests per hour rate limit", () => {
      expect(config.rateLimit.windowMs).toBe(3600000);
      expect(config.rateLimit.maxRequests).toBe(5);
    });

    it("allows 1 max agent", () => {
      expect(config.maxAgents).toBe(1);
    });

    it("does not have BYOK", () => {
      expect(config.byok).toBe(false);
    });

    it("does not have API access", () => {
      expect(config.apiAccess).toBe(false);
    });

    it("has no grant", () => {
      expect(config.grantMicro).toBe(0);
    });

    it("includes Haiku and Sonnet models", () => {
      expect(config.models).toContain("claude-haiku");
      expect(config.models).toContain("claude-sonnet");
    });
  });

  describe("pass tier", () => {
    const config = TIER_CONFIG.pass;

    it("has 15 requests per hour rate limit", () => {
      expect(config.rateLimit.windowMs).toBe(3600000);
      expect(config.rateLimit.maxRequests).toBe(15);
    });

    it("allows 5 max agents", () => {
      expect(config.maxAgents).toBe(5);
    });

    it("has BYOK enabled", () => {
      expect(config.byok).toBe(true);
    });

    it("does not have API access", () => {
      expect(config.apiAccess).toBe(false);
    });

    it("has 30000 micro-credit grant (300 credits)", () => {
      expect(config.grantMicro).toBe(30000);
    });
  });

  describe("lab tier", () => {
    const config = TIER_CONFIG.lab;

    it("has unlimited rate limit", () => {
      expect(config.rateLimit.maxRequests).toBe(Infinity);
    });

    it("allows unlimited agents", () => {
      expect(config.maxAgents).toBe(Infinity);
    });

    it("has BYOK enabled", () => {
      expect(config.byok).toBe(true);
    });

    it("has API access", () => {
      expect(config.apiAccess).toBe(true);
    });

    it("has 60000 micro-credit grant (600 credits)", () => {
      expect(config.grantMicro).toBe(60000);
    });
  });
});

describe("ANONYMOUS_RATE_LIMIT", () => {
  it("is 2 requests per hour", () => {
    expect(ANONYMOUS_RATE_LIMIT.windowMs).toBe(3600000);
    expect(ANONYMOUS_RATE_LIMIT.maxRequests).toBe(2);
  });
});

// ── getRateLimitConfigForTier ────────────────────────────

describe("getRateLimitConfigForTier", () => {
  it("returns anonymous rate limit for 'anonymous'", () => {
    const config = getRateLimitConfigForTier("anonymous");
    expect(config).toEqual(ANONYMOUS_RATE_LIMIT);
  });

  it("returns tier rate limit for each tier", () => {
    expect(getRateLimitConfigForTier(UserTier.FREE)).toEqual(TIER_CONFIG.free.rateLimit);
    expect(getRateLimitConfigForTier(UserTier.PASS)).toEqual(TIER_CONFIG.pass.rateLimit);
    expect(getRateLimitConfigForTier(UserTier.LAB)).toEqual(TIER_CONFIG.lab.rateLimit);
  });
});

// ── resolveTierFromPriceId (mocked env) ──────────────────

describe("resolveTierFromPriceId", () => {
  beforeEach(async () => {
    // Reset env cache before each test
    const { _resetEnvCache } = await import("@/lib/common/env");
    _resetEnvCache();

    // Set up required base env vars
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/test");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_clerk");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_clerk");
  });

  it("resolves PASS tier from STRIPE_PASS_PRICE_ID", async () => {
    vi.stubEnv("STRIPE_PASS_PRICE_ID", "price_pass_test");
    vi.stubEnv("STRIPE_LAB_PRICE_ID", "price_lab_test");

    // Re-import to get fresh module with new env
    const { resolveTierFromPriceId } = await import("./tier");

    expect(resolveTierFromPriceId("price_pass_test")).toBe("pass");
  });

  it("resolves LAB tier from STRIPE_LAB_PRICE_ID", async () => {
    vi.stubEnv("STRIPE_PASS_PRICE_ID", "price_pass_test");
    vi.stubEnv("STRIPE_LAB_PRICE_ID", "price_lab_test");

    const { resolveTierFromPriceId } = await import("./tier");

    expect(resolveTierFromPriceId("price_lab_test")).toBe("lab");
  });

  it("throws for unknown price ID", async () => {
    vi.stubEnv("STRIPE_PASS_PRICE_ID", "price_pass_test");
    vi.stubEnv("STRIPE_LAB_PRICE_ID", "price_lab_test");

    const { resolveTierFromPriceId } = await import("./tier");

    expect(() => resolveTierFromPriceId("price_unknown")).toThrow(
      "Unknown Stripe price ID: price_unknown"
    );
  });
});

// ── getUserTier (live database) ──────────────────────────

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("getUserTier (live database)", () => {
  let db: Awaited<typeof import("@/db")>["db"];
  let schema: Awaited<typeof import("@/db/schema")>;
  let getUserTier: Awaited<typeof import("./tier")>["getUserTier"];
  let eq: Awaited<typeof import("drizzle-orm")>["eq"];

  const testPrefix = `test-tier-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const testUserFree = `${testPrefix}-free`;
  const testUserPass = `${testPrefix}-pass`;
  const testUserLab = `${testPrefix}-lab`;

  beforeAll(async () => {
    // Neon serverless driver needs WebSocket in Node.js.
    const { neonConfig } = await import("@neondatabase/serverless");
    const ws = await import("ws");
    neonConfig.webSocketConstructor = ws.default;

    const drizzleOrm = await import("drizzle-orm");
    eq = drizzleOrm.eq;
    schema = await import("@/db/schema");
    db = (await import("@/db")).db;
    getUserTier = (await import("./tier")).getUserTier;

    // Create test users with different tiers
    await db.insert(schema.users).values([
      { id: testUserFree, email: `${testUserFree}@test.com`, subscriptionTier: "free" },
      { id: testUserPass, email: `${testUserPass}@test.com`, subscriptionTier: "pass" },
      { id: testUserLab, email: `${testUserLab}@test.com`, subscriptionTier: "lab" },
    ]).onConflictDoNothing();
  });

  afterAll(async () => {
    if (db && schema) {
      for (const id of [testUserFree, testUserPass, testUserLab]) {
        await db.delete(schema.users).where(eq(schema.users.id, id));
      }
    }
  });

  it("returns 'free' for unknown user", async () => {
    const tier = await getUserTier("nonexistent-user-id-xyz");
    expect(tier).toBe("free");
  });

  it("returns 'free' for user with free tier", async () => {
    const tier = await getUserTier(testUserFree);
    expect(tier).toBe("free");
  });

  it("returns 'pass' for user with pass tier", async () => {
    const tier = await getUserTier(testUserPass);
    expect(tier).toBe("pass");
  });

  it("returns 'lab' for user with lab tier", async () => {
    const tier = await getUserTier(testUserLab);
    expect(tier).toBe("lab");
  });
});

describe("getUserTier (no database)", () => {
  it("skips live tests when DATABASE_URL is not set", () => {
    expect(true).toBe(true);
  });
});
