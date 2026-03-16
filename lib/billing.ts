// Billing domain logic extracted from the Stripe webhook handler.
//
// Each function handles one webhook event type. The webhook route
// (app/api/credits/webhook/route.ts) is the transport layer: it
// verifies the Stripe signature, parses the event, and dispatches
// to these functions. Business rules, credit grants, tier changes,
// idempotency guards, and analytics calls live here.

import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

import { requireDb } from '@/db';
import { creditTransactions, users } from '@/db/schema';
import {
  applyCreditDelta,
  ensureCreditAccount,
  MICRO_PER_CREDIT,
  SUBSCRIPTION_GRANT_PASS,
  SUBSCRIPTION_GRANT_LAB,
  MONTHLY_CREDITS_PASS,
  MONTHLY_CREDITS_LAB,
} from '@/lib/credits';
import { log } from '@/lib/logger';
import { serverTrack, serverIdentify } from '@/lib/posthog-server';
import { resolveTierFromPriceId, type UserTier } from '@/lib/tier';

// ---- Internal helpers ----

/**
 * Update a user's subscription tier and Stripe metadata in the database.
 * Called by subscription lifecycle webhook events.
 */
async function updateUserSubscription(params: {
  userId: string;
  tier: UserTier;
  subscriptionId: string;
  subscriptionStatus: string;
  currentPeriodEnd?: Date | null;
  stripeCustomerId: string | null;
}) {
  const db = requireDb();
  await db
    .update(users)
    .set({
      subscriptionTier: params.tier,
      subscriptionId: params.subscriptionId,
      subscriptionStatus: params.subscriptionStatus,
      ...(params.currentPeriodEnd !== undefined
        ? { subscriptionCurrentPeriodEnd: params.currentPeriodEnd }
        : {}),
      ...(params.stripeCustomerId
        ? { stripeCustomerId: params.stripeCustomerId }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, params.userId));
}

/**
 * Check whether a credit grant with the given referenceId already exists.
 * Used to make all grant paths idempotent against Stripe webhook retries.
 */
async function hasExistingGrant(referenceId: string): Promise<boolean> {
  const db = requireDb();
  const [existing] = await db
    .select({ id: creditTransactions.id })
    .from(creditTransactions)
    .where(eq(creditTransactions.referenceId, referenceId))
    .limit(1);
  return !!existing;
}

/**
 * Resolve a userId from an invoice, falling back to DB lookup by
 * stripeCustomerId when metadata isn't propagated on the invoice.
 */
async function resolveUserIdFromInvoice(invoice: {
  customer: string;
  subscription_details?: { metadata?: Record<string, string> };
}): Promise<string | undefined> {
  let userId = invoice.subscription_details?.metadata?.userId;
  if (!userId && invoice.customer) {
    const db = requireDb();
    const [found] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.stripeCustomerId, invoice.customer))
      .limit(1);
    userId = found?.id;
  }
  return userId;
}

// ---- Exported event handlers ----

/**
 * Handle checkout.session.completed - credit pack purchase (one-time payment).
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  // Only process one-time payment checkouts (not subscription checkouts)
  if (session.mode !== 'payment') return;

  const userId = session.metadata?.userId;
  const credits = session.metadata?.credits
    ? Number(session.metadata.credits)
    : 0;

  const existing = await hasExistingGrant(session.id);
  const shouldProcess = userId && credits > 0 && !existing;

  if (shouldProcess) {
    await ensureCreditAccount(userId);
    const deltaMicro = credits * MICRO_PER_CREDIT;
    await applyCreditDelta(userId, deltaMicro, 'purchase', {
      referenceId: session.id,
      credits,
    });
    try {
      await serverTrack(userId, 'credit_purchase_completed', {
        credits,
        amount_total: session.amount_total ?? 0,
        currency: session.currency ?? 'gbp',
        session_id: session.id,
      });
    } catch {
      // Best-effort - analytics loss is acceptable, webhook failure is not
    }
  }

  if (existing) {
    log.info('Webhook: duplicate session, skipping', { sessionId: session.id });
  }
}

/**
 * Handle customer.subscription.created - resolve tier, update user,
 * apply one-time credit grant, identify user in PostHog.
 */
export async function handleSubscriptionCreated(
  subscription: {
    id: string;
    status: string;
    customer: string;
    metadata?: Record<string, string>;
    items?: { data: Array<{ price: { id: string } }> };
    current_period_end?: number;
  },
): Promise<void> {
  const userId = subscription.metadata?.userId;
  const priceId = subscription.items?.data[0]?.price.id;

  if (!userId || !priceId) return;

  const tier = resolveTierFromPriceId(priceId);
  if (!tier) return;

  await updateUserSubscription({
    userId,
    tier,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null,
    stripeCustomerId: subscription.customer,
  });

  // One-time credit grant on new subscription (idempotent)
  const grantCredits = tier === 'lab'
    ? SUBSCRIPTION_GRANT_LAB
    : tier === 'pass'
      ? SUBSCRIPTION_GRANT_PASS
      : 0;
  const subscriptionGrantRef = `${subscription.id}:subscription_grant`;
  if (grantCredits > 0 && !(await hasExistingGrant(subscriptionGrantRef))) {
    await ensureCreditAccount(userId);
    await applyCreditDelta(
      userId,
      grantCredits * MICRO_PER_CREDIT,
      'subscription_grant',
      { referenceId: subscriptionGrantRef, tier, credits: grantCredits },
    );
    log.info('Subscription grant applied', { userId, tier, credits: grantCredits });
  }

  try {
    await serverTrack(userId, 'subscription_started', {
      tier,
      subscription_id: subscription.id,
      status: subscription.status,
      grant_credits: grantCredits,
    });
  } catch {
    // Best-effort - analytics loss is acceptable, webhook failure is not
  }
  try {
    await serverIdentify(userId, { current_tier: tier });
  } catch {
    // Best-effort - analytics loss is acceptable, webhook failure is not
  }
  log.info('Subscription created', { userId, tier, subscriptionId: subscription.id });
}

/**
 * Handle customer.subscription.updated - detect upgrade/downgrade,
 * adjust credits on upgrade, update tier.
 */
export async function handleSubscriptionUpdated(
  subscription: {
    id: string;
    status: string;
    customer: string;
    metadata?: Record<string, string>;
    items?: { data: Array<{ price: { id: string } }> };
    current_period_end?: number;
  },
): Promise<void> {
  const userId = subscription.metadata?.userId;
  const priceId = subscription.items?.data[0]?.price.id;

  if (!userId || !priceId) return;

  const tier = resolveTierFromPriceId(priceId);
  if (!tier) return;

  // Read the old tier BEFORE writing the update - otherwise the
  // comparison always sees oldTier === newTier.
  // Exhaustive tier ordering - TypeScript enforces all UserTier values
  // are mapped, so adding a new tier without updating this map is a
  // compile-time error (no silent misclassification of upgrades).
  const tierOrder: Record<UserTier, number> = { free: 0, pass: 1, lab: 2 };
  const db = requireDb();
  const [currentUser] = await db
    .select({ tier: users.subscriptionTier })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const oldTier: UserTier = (currentUser?.tier as UserTier) ?? 'free';
  const oldTierRank = tierOrder[oldTier];
  const newTierRank = tierOrder[tier];

  await updateUserSubscription({
    userId,
    tier,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null,
    stripeCustomerId: subscription.customer,
  });

  if (newTierRank > oldTierRank) {
    // Incremental credit grant on upgrade (difference between tiers)
    const grantMap: Record<UserTier, number> = {
      free: 0,
      pass: SUBSCRIPTION_GRANT_PASS,
      lab: SUBSCRIPTION_GRANT_LAB,
    };
    const incrementalGrant = grantMap[tier] - grantMap[oldTier];
    // Include tier transition in referenceId so a user who downgrades
    // then re-upgrades on the same subscription gets a fresh grant.
    const upgradeGrantRef = `${subscription.id}:upgrade_grant:${oldTier}:${tier}`;
    if (incrementalGrant > 0 && !(await hasExistingGrant(upgradeGrantRef))) {
      await ensureCreditAccount(userId);
      await applyCreditDelta(
        userId,
        incrementalGrant * MICRO_PER_CREDIT,
        'subscription_upgrade_grant',
        {
          referenceId: upgradeGrantRef,
          from_tier: oldTier,
          to_tier: tier,
          credits: incrementalGrant,
        },
      );
      log.info('Upgrade grant applied', { userId, from: oldTier, to: tier, credits: incrementalGrant });
    }

    try {
      await serverTrack(userId, 'subscription_upgraded', {
        from_tier: oldTier,
        to_tier: tier,
        subscription_id: subscription.id,
        grant_credits: incrementalGrant,
      });
    } catch {
      // Best-effort - analytics loss is acceptable, webhook failure is not
    }
  } else if (newTierRank < oldTierRank) {
    try {
      await serverTrack(userId, 'subscription_downgraded', {
        from_tier: oldTier,
        to_tier: tier,
        subscription_id: subscription.id,
      });
    } catch {
      // Best-effort - analytics loss is acceptable, webhook failure is not
    }
  }
  try {
    await serverIdentify(userId, { current_tier: tier });
  } catch {
    // Best-effort - analytics loss is acceptable, webhook failure is not
  }
  log.info('Subscription updated', { userId, tier, status: subscription.status });
}

/**
 * Handle customer.subscription.deleted - downgrade to free tier on
 * cancellation or expiry.
 */
export async function handleSubscriptionDeleted(
  subscription: {
    id: string;
    status: string;
    customer: string;
    metadata?: Record<string, string>;
  },
): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  // Read previous tier BEFORE the downgrade for churn analytics
  const db = requireDb();
  const [churnedUser] = await db
    .select({ tier: users.subscriptionTier })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const previousTier = churnedUser?.tier ?? 'free';

  // Immediate downgrade to free
  await updateUserSubscription({
    userId,
    tier: 'free',
    subscriptionId: subscription.id,
    subscriptionStatus: 'canceled',
    currentPeriodEnd: null,
    stripeCustomerId: subscription.customer,
  });
  try {
    await serverTrack(userId, 'subscription_churned', {
      subscription_id: subscription.id,
      previous_tier: previousTier,
    });
  } catch {
    // Best-effort - analytics loss is acceptable, webhook failure is not
  }
  try {
    await serverIdentify(userId, { current_tier: 'free' });
  } catch {
    // Best-effort - analytics loss is acceptable, webhook failure is not
  }
  log.info('Subscription deleted, downgraded to free', { userId });
}

/**
 * Handle invoice.payment_failed - immediate downgrade to free tier,
 * track failed payment.
 */
export async function handleInvoicePaymentFailed(
  invoice: {
    id: string;
    customer: string;
    subscription?: string;
    subscription_details?: { metadata?: Record<string, string> };
  },
): Promise<void> {
  const userId = await resolveUserIdFromInvoice(invoice);

  if (!userId || !invoice.subscription) return;

  // Read previous tier BEFORE the downgrade for analytics
  const db = requireDb();
  const [failedUser] = await db
    .select({ tier: users.subscriptionTier })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const previousTier = failedUser?.tier ?? 'free';

  await updateUserSubscription({
    userId,
    tier: 'free',
    subscriptionId: invoice.subscription,
    subscriptionStatus: 'past_due',
    currentPeriodEnd: null,
    stripeCustomerId: invoice.customer,
  });
  try {
    await serverTrack(userId, 'payment_failed', {
      subscription_id: invoice.subscription,
      invoice_id: invoice.id,
      previous_tier: previousTier,
    });
  } catch {
    // Best-effort - analytics loss is acceptable, webhook failure is not
  }
  try {
    await serverIdentify(userId, { current_tier: 'free' });
  } catch {
    // Best-effort - analytics loss is acceptable, webhook failure is not
  }
  log.info('Payment failed, downgraded to free', { userId, subscriptionId: invoice.subscription });
}

/**
 * Handle invoice.payment_succeeded - restore tier after retry,
 * apply monthly recurring credit grant on renewals.
 */
export async function handleInvoicePaymentSucceeded(
  invoice: {
    id: string;
    customer: string;
    subscription?: string;
    billing_reason?: string;
    subscription_details?: { metadata?: Record<string, string> };
    lines?: { data: Array<{ price: { id: string } }> };
  },
): Promise<void> {
  const userId = await resolveUserIdFromInvoice(invoice);

  const priceId = invoice.lines?.data[0]?.price.id;

  if (!userId || !invoice.subscription || !priceId) return;

  const tier = resolveTierFromPriceId(priceId);
  if (!tier) return;

  // Omit currentPeriodEnd - Stripe doesn't guarantee webhook delivery
  // order, so subscription.updated may arrive before or after this event.
  // Preserving the existing value avoids overwriting a correct date with null.
  await updateUserSubscription({
    userId,
    tier,
    subscriptionId: invoice.subscription,
    subscriptionStatus: 'active',
    stripeCustomerId: invoice.customer,
  });

  // Monthly recurring credit grant - only on renewal invoices.
  // Stripe fires both customer.subscription.created AND
  // invoice.payment_succeeded on initial subscribe. The one-time grant
  // is handled by subscription.created; skip the monthly grant for the
  // first invoice to avoid double-granting.
  const isRenewal = invoice.billing_reason !== 'subscription_create';
  const monthlyCredits = tier === 'lab'
    ? MONTHLY_CREDITS_LAB
    : tier === 'pass'
      ? MONTHLY_CREDITS_PASS
      : 0;
  const monthlyGrantRef = `${invoice.id}:monthly_grant`;
  if (isRenewal && monthlyCredits > 0 && !(await hasExistingGrant(monthlyGrantRef))) {
    await ensureCreditAccount(userId);
    await applyCreditDelta(
      userId,
      monthlyCredits * MICRO_PER_CREDIT,
      'monthly_grant',
      {
        referenceId: monthlyGrantRef,
        tier,
        credits: monthlyCredits,
      },
    );
    log.info('Monthly credit grant applied', { userId, tier, credits: monthlyCredits });
  }

  log.info('Payment succeeded, tier restored', { userId, tier });
}
