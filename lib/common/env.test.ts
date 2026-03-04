// env.test.ts — Intent tests for environment validation.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getEnv, _resetEnvCache } from "./env";

const VALID_ENV = {
  DATABASE_URL: "postgresql://localhost/test",
  ANTHROPIC_API_KEY: "sk-ant-test",
  CLERK_SECRET_KEY: "sk_test_clerk",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_clerk",
};

beforeEach(() => {
  _resetEnvCache();
  // Reset process.env to a clean baseline
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("CLERK_SECRET_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
  vi.stubEnv("SUBSCRIPTIONS_ENABLED", "");
  vi.stubEnv("CREDITS_ENABLED", "");
  vi.stubEnv("BYOK_ENABLED", "");
  vi.stubEnv("PREMIUM_ENABLED", "");
  vi.stubEnv("STRIPE_SECRET_KEY", "");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
  vi.stubEnv("STRIPE_PASS_PRICE_ID", "");
  vi.stubEnv("STRIPE_LAB_PRICE_ID", "");
});

describe("env", () => {
  it("feature flags default to false", () => {
    for (const [key, val] of Object.entries(VALID_ENV)) {
      vi.stubEnv(key, val);
    }
    const env = getEnv();
    expect(env.SUBSCRIPTIONS_ENABLED).toBe(false);
    expect(env.CREDITS_ENABLED).toBe(false);
    expect(env.BYOK_ENABLED).toBe(false);
    expect(env.PREMIUM_ENABLED).toBe(false);
  });

  it("throws on missing required vars", () => {
    // Only set some vars — DATABASE_URL is missing
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_clerk");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_clerk");
    expect(() => getEnv()).toThrow("Environment validation failed");
  });

  it("requires Stripe vars when SUBSCRIPTIONS_ENABLED is true", () => {
    for (const [key, val] of Object.entries(VALID_ENV)) {
      vi.stubEnv(key, val);
    }
    vi.stubEnv("SUBSCRIPTIONS_ENABLED", "true");
    // Missing Stripe vars → should throw
    expect(() => getEnv()).toThrow("STRIPE_SECRET_KEY");
  });

  it("accepts Stripe vars when SUBSCRIPTIONS_ENABLED is true", () => {
    for (const [key, val] of Object.entries(VALID_ENV)) {
      vi.stubEnv(key, val);
    }
    vi.stubEnv("SUBSCRIPTIONS_ENABLED", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_stripe");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("STRIPE_PASS_PRICE_ID", "price_pass");
    vi.stubEnv("STRIPE_LAB_PRICE_ID", "price_lab");

    const env = getEnv();
    expect(env.SUBSCRIPTIONS_ENABLED).toBe(true);
    expect(env.STRIPE_SECRET_KEY).toBe("sk_test_stripe");
  });

  it("caches result on second call", () => {
    for (const [key, val] of Object.entries(VALID_ENV)) {
      vi.stubEnv(key, val);
    }
    const first = getEnv();
    const second = getEnv();
    expect(first).toBe(second); // same reference
  });
});
