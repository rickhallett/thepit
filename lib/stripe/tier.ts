/**
 * lib/stripe/tier.ts — Tier configuration and resolution.
 *
 * Maps subscription tiers to rate limits, model access, and feature gates.
 * Source of truth for tier-based access control across the application.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getEnv } from "@/lib/common/env";
import type { RateLimitConfig } from "@/lib/common/rate-limit";

// ── Types ────────────────────────────────────────────────

export const UserTier = {
  FREE: "free",
  PASS: "pass",
  LAB: "lab",
} as const;
export type UserTier = (typeof UserTier)[keyof typeof UserTier];

export interface TierConfig {
  rateLimit: RateLimitConfig;
  models: string[];
  maxAgents: number; // 0 = cannot create
  byok: boolean;
  apiAccess: boolean;
  grantMicro: number; // subscription one-time + monthly grant in micro-credits
}

// ── Configuration ────────────────────────────────────────

export const TIER_CONFIG: Record<UserTier, TierConfig> = {
  free: {
    rateLimit: { windowMs: 3600000, maxRequests: 5 },
    models: ["claude-haiku", "claude-sonnet"],
    maxAgents: 1,
    byok: false,
    apiAccess: false,
    grantMicro: 0,
  },
  pass: {
    rateLimit: { windowMs: 3600000, maxRequests: 15 },
    models: ["claude-haiku", "claude-sonnet"],
    maxAgents: 5,
    byok: true,
    apiAccess: false,
    grantMicro: 30000, // 300 credits = 30000 micro
  },
  lab: {
    rateLimit: { windowMs: 3600000, maxRequests: Infinity },
    models: ["claude-haiku", "claude-sonnet"],
    maxAgents: Infinity,
    byok: true,
    apiAccess: true,
    grantMicro: 60000, // 600 credits = 60000 micro
  },
};

// Anonymous rate limit (not a tier — used when no userId)
export const ANONYMOUS_RATE_LIMIT: RateLimitConfig = {
  windowMs: 3600000,
  maxRequests: 2,
};

// ── Resolution ───────────────────────────────────────────

/**
 * Resolve a Stripe price ID to a UserTier.
 * @throws Error if price ID does not match any known tier
 */
export function resolveTierFromPriceId(priceId: string): UserTier {
  const env = getEnv();

  if (priceId === env.STRIPE_PASS_PRICE_ID) {
    return UserTier.PASS;
  }
  if (priceId === env.STRIPE_LAB_PRICE_ID) {
    return UserTier.LAB;
  }

  throw new Error(`Unknown Stripe price ID: ${priceId}`);
}

/**
 * Get a user's subscription tier from the database.
 * Returns 'free' if user not found.
 */
export async function getUserTier(userId: string): Promise<UserTier> {
  const result = await db
    .select({ subscriptionTier: users.subscriptionTier })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (result.length === 0) {
    return UserTier.FREE;
  }

  // subscriptionTier defaults to 'free' in schema, but could be null
  return (result[0].subscriptionTier as UserTier) ?? UserTier.FREE;
}

/**
 * Get rate limit config for a tier or anonymous access.
 */
export function getRateLimitConfigForTier(
  tier: UserTier | "anonymous",
): RateLimitConfig {
  if (tier === "anonymous") {
    return ANONYMOUS_RATE_LIMIT;
  }
  return TIER_CONFIG[tier].rateLimit;
}
