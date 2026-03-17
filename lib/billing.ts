// Billing domain logic extracted from the Stripe webhook handler.
//
// Each function handles one webhook event type. The webhook route
// (app/api/credits/webhook/route.ts) is the transport layer: it
// verifies the Stripe signature, parses the event, and dispatches
// to these functions. Business rules, credit grants, tier changes,
// idempotency guards, and analytics calls live here.

import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

import { requireDb, type DbOrTx } from '@/db';
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
}, tx?: DbOrTx) {
  const conn = tx ?? requireDb();
  await conn
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
async function hasExistingGrant(referenceId: string, tx?: DbOrTx): Promise<boolean> {
  const conn = tx ?? requireDb();
  const [existing] = await conn
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

  if (!userId || credits <= 0) return;

  // Wrap idempotency check + credit grant in a transaction so a concurrent
  // webhook retry cannot pass hasExistingGrant simultaneously and double-grant.
  const db = requireDb();
  const granted = await db.transaction(async (tx) => {
    const existing = await hasExistingGrant(session.id, tx);
    if (existing) {
      log.info('Webhook: duplicate session, skipping', { sessionId: session.id });
      return false;
    }
    await ensureCreditAccount(userId, tx);
    const deltaMicro = credits * MICRO_PER_CREDIT;
    await applyCreditDelta(userId, deltaMicro, 'purchase', {
      referenceId: session.id,
      credits,
    }, tx);
    return true;
  });

  if (granted) {
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

  // Wrap tier update + credit grant in a transaction so the user's tier
  // and their one-time grant are atomic. Without this, a failure after
  // updateUserSubscription but before applyCreditDelta leaves the user
  // with the correct tier but missing their grant.
  const db = requireDb();
  const grantCredits = tier === 'lab'
    ? SUBSCRIPTION_GRANT_LAB
    : tier === 'pass'
      ? SUBSCRIPTION_GRANT_PASS
      : 0;
  const subscriptionGrantRef = `${subscription.id}:subscription_grant`;

  await db.transaction(async (tx) => {
    await updateUserSubscription({
      userId,
      tier,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
      stripeCustomerId: subscription.customer,
    }, tx);

    if (grantCredits > 0 && !(await hasExistingGrant(subscriptionGrantRef, tx))) {
      await ensureCreditAccount(userId, tx);
      await applyCreditDelta(
        userId,
        grantCredits * MICRO_PER_CREDIT,
        'subscription_grant',
        { referenceId: subscriptionGrantRef, tier, credits: grantCredits },
        tx,
      );
      log.info('Subscription grant applied', { userId, tier, credits: grantCredits });
    }
  });

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
  // Wrap tier read + update + credit grant in a transaction to prevent
  // TOCTOU: concurrent webhook deliveries could both read the old tier
  // and both apply upgrade grants based on a stale baseline.
  const tierOrder: Record<UserTier, number> = { free: 0, pass: 1, lab: 2 };
  const db = requireDb();

  const { oldTier, newTierRank, oldTierRank } = await db.transaction(async (tx) => {
    const [currentUser] = await tx
      .select({ tier: users.subscriptionTier })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const innerOldTier: UserTier = (currentUser?.tier as UserTier) ?? 'free';

    await updateUserSubscription({
      userId,
      tier,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
      stripeCustomerId: subscription.customer,
    }, tx);

    const innerOldTierRank = tierOrder[innerOldTier];
    const innerNewTierRank = tierOrder[tier];

    if (innerNewTierRank > innerOldTierRank) {
      const grantMap: Record<UserTier, number> = {
        free: 0,
        pass: SUBSCRIPTION_GRANT_PASS,
        lab: SUBSCRIPTION_GRANT_LAB,
      };
      const incrementalGrant = grantMap[tier] - grantMap[innerOldTier];
      const upgradeGrantRef = `${subscription.id}:upgrade_grant:${innerOldTier}:${tier}`;
      if (incrementalGrant > 0 && !(await hasExistingGrant(upgradeGrantRef, tx))) {
        await ensureCreditAccount(userId, tx);
        await applyCreditDelta(
          userId,
          incrementalGrant * MICRO_PER_CREDIT,
          'subscription_upgrade_grant',
          {
            referenceId: upgradeGrantRef,
            from_tier: innerOldTier,
            to_tier: tier,
            credits: incrementalGrant,
          },
          tx,
        );
        log.info('Upgrade grant applied', { userId, from: innerOldTier, to: tier, credits: incrementalGrant });
      }
    }

    return { oldTier: innerOldTier as UserTier, newTierRank: innerNewTierRank, oldTierRank: innerOldTierRank };
  });

  if (newTierRank > oldTierRank) {
    const grantMap: Record<UserTier, number> = {
      free: 0,
      pass: SUBSCRIPTION_GRANT_PASS,
      lab: SUBSCRIPTION_GRANT_LAB,
    };
    try {
      await serverTrack(userId, 'subscription_upgraded', {
        from_tier: oldTier,
        to_tier: tier,
        subscription_id: subscription.id,
        grant_credits: grantMap[tier] - grantMap[oldTier],
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

  // Wrap tier restore + monthly grant in a transaction so the user's tier
  // and their monthly credit grant are atomic.
  const db = requireDb();
  const isRenewal = invoice.billing_reason !== 'subscription_create';
  const monthlyCredits = tier === 'lab'
    ? MONTHLY_CREDITS_LAB
    : tier === 'pass'
      ? MONTHLY_CREDITS_PASS
      : 0;
  const monthlyGrantRef = `${invoice.id}:monthly_grant`;

  await db.transaction(async (tx) => {
    // Omit currentPeriodEnd - Stripe doesn't guarantee webhook delivery
    // order, so subscription.updated may arrive before or after this event.
    await updateUserSubscription({
      userId,
      tier,
      subscriptionId: invoice.subscription!,
      subscriptionStatus: 'active',
      stripeCustomerId: invoice.customer,
    }, tx);

    // Monthly recurring credit grant - only on renewal invoices.
    if (isRenewal && monthlyCredits > 0 && !(await hasExistingGrant(monthlyGrantRef, tx))) {
      await ensureCreditAccount(userId, tx);
      await applyCreditDelta(
        userId,
        monthlyCredits * MICRO_PER_CREDIT,
        'monthly_grant',
        {
          referenceId: monthlyGrantRef,
          tier,
          credits: monthlyCredits,
        },
        tx,
      );
      log.info('Monthly credit grant applied', { userId, tier, credits: monthlyCredits });
    }
  });

  log.info('Payment succeeded, tier restored', { userId, tier });
}
