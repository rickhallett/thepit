// Subscription tier configuration and access control.
//
// Centralizes all tier-dependent logic: bout limits, model access,
// agent slots, and daily rate caps. Every route that needs to check
// "can this user do X?" calls into this module.
//
// Tier resolution order:
//   1. Admin users are always treated as 'lab' tier.
//   2. Otherwise, read subscriptionTier from the users table.
//   3. Default to 'free' if no record exists.

import { eq, sql, and, gte, count } from 'drizzle-orm';

import { requireDb } from '@/db';
import { log } from '@/lib/logger';
import { bouts, users } from '@/db/schema';
import { isAdmin } from '@/lib/admin';
import { MODEL_FAMILY } from '@/lib/models';

export type UserTier = 'free' | 'pass' | 'lab';

export const SUBSCRIPTIONS_ENABLED =
  process.env.SUBSCRIPTIONS_ENABLED === 'true';

/** Map Stripe price IDs to subscription tiers. */
const PRICE_TO_TIER: Record<string, UserTier> = {
  ...(process.env.STRIPE_PASS_PRICE_ID
    ? { [process.env.STRIPE_PASS_PRICE_ID]: 'pass' as const }
    : {}),
  ...(process.env.STRIPE_LAB_PRICE_ID
    ? { [process.env.STRIPE_LAB_PRICE_ID]: 'lab' as const }
    : {}),
};

/** Resolve a Stripe price ID to a UserTier. Returns null if unrecognized. */
export function resolveTierFromPriceId(priceId: string): UserTier | null {
  return PRICE_TO_TIER[priceId] ?? null;
}

export type TierConfig = {
  /** Max platform-funded bouts per day (BYOK unlimited for all tiers). */
  boutsPerDay: number;
  /** Lifetime cap on platform-funded bouts (null = unlimited). */
  lifetimeBoutCap: number | null;
  /** Which model families this tier can access. */
  models: ('haiku' | 'sonnet' | 'opus')[];
  /** Max custom agents the user can own. */
  maxAgents: number;
  /** Whether the user can access the API. */
  apiAccess: boolean;
  /** Whether the user gets analytics on their agents. */
  agentAnalytics: boolean;
};

export const TIER_CONFIG: Record<UserTier, TierConfig> = {
  free: {
    boutsPerDay: 5,
    lifetimeBoutCap: null,
    models: ['haiku', 'sonnet'],
    maxAgents: 1,
    apiAccess: false,
    agentAnalytics: false,
  },
  pass: {
    boutsPerDay: 15,
    lifetimeBoutCap: null,
    models: ['haiku', 'sonnet'],
    maxAgents: 5,
    apiAccess: false,
    agentAnalytics: true,
  },
  lab: {
    boutsPerDay: 100,
    lifetimeBoutCap: null,
    models: ['haiku', 'sonnet', 'opus'],
    maxAgents: Infinity,
    apiAccess: true,
    agentAnalytics: true,
  },
};

// MODEL_FAMILY imported from @/lib/models (centralized model registry).

/**
 * Resolve a user's effective tier.
 * Admin users always get 'lab'. Otherwise reads from DB.
 */
export async function getUserTier(userId: string): Promise<UserTier> {
  if (isAdmin(userId)) return 'lab';

  if (!SUBSCRIPTIONS_ENABLED) return 'lab';

  const db = requireDb();
  const [user] = await db
    .select({ subscriptionTier: users.subscriptionTier })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return (user?.subscriptionTier as UserTier) ?? 'free';
}

/**
 * Get the user's current free bout usage (lifetime counter).
 */
export async function getFreeBoutsUsed(userId: string): Promise<number> {
  const db = requireDb();
  const [user] = await db
    .select({ freeBoutsUsed: users.freeBoutsUsed })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.freeBoutsUsed ?? 0;
}

/**
 * Increment the user's lifetime free bout counter.
 *
 * @returns The number of rows updated (0 if the user doesn't exist).
 */
export async function incrementFreeBoutsUsed(userId: string): Promise<number> {
  const db = requireDb();
  const result = await db
    .update(users)
    .set({
      freeBoutsUsed: sql`${users.freeBoutsUsed} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (result.length === 0) {
    log.warn('incrementFreeBoutsUsed: no user found', { userId });
  }

  return result.length;
}

/**
 * Count the user's platform-funded bouts started today (UTC).
 * Used to enforce per-tier daily rate limits.
 */
export async function getDailyBoutsUsed(userId: string): Promise<number> {
  const db = requireDb();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [result] = await db
    .select({ total: count() })
    .from(bouts)
    .where(
      and(
        eq(bouts.ownerId, userId),
        gte(bouts.createdAt, todayStart),
      ),
    );

  return result?.total ?? 0;
}

/**
 * Check whether a user can run a platform-funded bout.
 * BYOK bouts bypass this entirely (they cost the platform nothing).
 *
 * Checks (in order):
 *   1. Lifetime bout cap (free tier only).
 *   2. Daily bout rate limit (all tiers).
 *
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export async function canRunBout(
  userId: string,
  isByok: boolean,
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  // BYOK bouts are always allowed regardless of tier
  if (isByok) return { allowed: true };

  const tier = await getUserTier(userId);
  const config = TIER_CONFIG[tier];

  // Check lifetime cap (free tier only)
  if (config.lifetimeBoutCap !== null) {
    const used = await getFreeBoutsUsed(userId);
    if (used >= config.lifetimeBoutCap) {
      return {
        allowed: false,
        reason: `Free tier limit reached (${config.lifetimeBoutCap} lifetime bouts). Upgrade or use your own API key (BYOK).`,
      };
    }
  }

  // Check daily bout rate limit
  const dailyUsed = await getDailyBoutsUsed(userId);
  if (dailyUsed >= config.boutsPerDay) {
    return {
      allowed: false,
      reason: `Daily limit reached (${config.boutsPerDay} bouts/day for ${tier === 'free' ? 'Free' : tier === 'pass' ? 'Pit Pass' : 'Pit Lab'} tier). ${tier === 'free' ? 'Upgrade' : 'Wait until tomorrow'} or use your own API key (BYOK).`,
    };
  }

  return { allowed: true };
}

/**
 * Check whether a user can create a new custom agent.
 */
export async function canCreateAgent(
  userId: string,
  currentAgentCount: number,
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const tier = await getUserTier(userId);
  const config = TIER_CONFIG[tier];

  if (currentAgentCount >= config.maxAgents) {
    return {
      allowed: false,
      reason: `${tier === 'free' ? 'Free' : tier === 'pass' ? 'Pit Pass' : 'Pit Lab'} tier allows ${config.maxAgents === Infinity ? 'unlimited' : config.maxAgents} custom agent${config.maxAgents === 1 ? '' : 's'}. Upgrade to create more.`,
    };
  }

  return { allowed: true };
}

/**
 * Check whether a user's tier allows access to a specific model.
 * BYOK always returns true (user pays with their own key).
 */
export function canAccessModel(
  tier: UserTier,
  modelId: string,
): boolean {
  if (modelId === 'byok') return true;

  const family = MODEL_FAMILY[modelId as keyof typeof MODEL_FAMILY];
  if (!family) return false; // Unknown models default to denied (fail-closed)

  return TIER_CONFIG[tier].models.includes(family);
}

/**
 * Get the list of model IDs available to a tier.
 */
export function getAvailableModels(tier: UserTier): string[] {
  const allowedFamilies = TIER_CONFIG[tier].models;
  return Object.entries(MODEL_FAMILY)
    .filter(([, family]) => allowedFamilies.includes(family))
    .map(([modelId]) => modelId);
}
