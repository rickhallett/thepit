import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

import { requireDb } from '@/db';
import { toError } from '@/lib/errors';
import { log } from '@/lib/logger';
import { withLogging } from '@/lib/api-logging';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';
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
import { stripe } from '@/lib/stripe';
import { resolveTierFromPriceId, type UserTier } from '@/lib/tier';
import { serverTrack, serverIdentify } from '@/lib/posthog-server';

export const runtime = 'nodejs';

/**
 * Update a user's subscription tier and Stripe metadata in the database.
 * Called by subscription lifecycle webhook events.
 */
async function updateUserSubscription(params: {
  userId: string;
  tier: UserTier;
  subscriptionId: string;
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
}) {
  const db = requireDb();
  await db
    .update(users)
    .set({
      subscriptionTier: params.tier,
      subscriptionId: params.subscriptionId,
      subscriptionStatus: params.subscriptionStatus,
      subscriptionCurrentPeriodEnd: params.currentPeriodEnd,
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
 * Handle Stripe webhook events for credit purchases and subscription lifecycle.
 *
 * Idempotency:
 * - checkout.session.completed: guarded by creditTransactions.referenceId lookup.
 * - subscription_grant: guarded by referenceId `{subscriptionId}:subscription_grant`.
 * - subscription_upgrade_grant: guarded by referenceId `{subscriptionId}:upgrade_grant`.
 * - monthly_grant: guarded by referenceId `{invoiceId}:monthly_grant`.
 *   Stripe webhook retries will hit the dedup check and skip.
 * - Subscription tier updates: naturally idempotent — updateUserSubscription
 *   is a SET (not increment), so replayed events write the same values.
 */
export const POST = withLogging(async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return errorResponse(API_ERRORS.SERVICE_UNAVAILABLE, 500);
  }

  const body = await req.text();
  const headerList = await headers();
  const signature = headerList.get('stripe-signature');
  if (!signature) {
    return errorResponse('Missing signature.', 400);
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    log.warn('Stripe webhook signature failed', toError(error));
    return errorResponse('Invalid signature.', 400);
  }

  // --- Credit pack purchase (one-time checkout) ---
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Only process one-time payment checkouts (not subscription checkouts)
    if (session.mode === 'payment') {
      const userId = session.metadata?.userId;
      const credits = session.metadata?.credits
        ? Number(session.metadata.credits)
        : 0;

      const db = requireDb();

      // Always check for existing transaction (consistent timing)
      const [existing] = await db
        .select({ id: creditTransactions.id })
        .from(creditTransactions)
        .where(eq(creditTransactions.referenceId, session.id))
        .limit(1);

      const shouldProcess = userId && credits > 0 && !existing;

      if (shouldProcess) {
        await ensureCreditAccount(userId);
        const deltaMicro = credits * MICRO_PER_CREDIT;
        await applyCreditDelta(userId, deltaMicro, 'purchase', {
          referenceId: session.id,
          credits,
        });
        await serverTrack(userId, 'credit_purchase_completed', {
          credits,
          amount_total: session.amount_total ?? 0,
          currency: session.currency ?? 'gbp',
          session_id: session.id,
        });
      }

      if (existing) {
        log.info('Webhook: duplicate session, skipping', { sessionId: session.id });
      }
    }
  }

  // --- Subscription created ---
  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object as {
      id: string;
      status: string;
      customer: string;
      metadata?: Record<string, string>;
      items?: { data: Array<{ price: { id: string } }> };
      current_period_end?: number;
    };

    const userId = subscription.metadata?.userId;
    const priceId = subscription.items?.data[0]?.price.id;

    if (userId && priceId) {
      const tier = resolveTierFromPriceId(priceId);
      if (tier) {
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

        await serverTrack(userId, 'subscription_started', {
          tier,
          subscription_id: subscription.id,
          status: subscription.status,
          grant_credits: grantCredits,
        });
        await serverIdentify(userId, { current_tier: tier });
        log.info('Subscription created', { userId, tier, subscriptionId: subscription.id });
      }
    }
  }

  // --- Subscription updated (upgrade, downgrade, renewal) ---
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as {
      id: string;
      status: string;
      customer: string;
      metadata?: Record<string, string>;
      items?: { data: Array<{ price: { id: string } }> };
      current_period_end?: number;
    };

    const userId = subscription.metadata?.userId;
    const priceId = subscription.items?.data[0]?.price.id;

    if (userId && priceId) {
      const tier = resolveTierFromPriceId(priceId);
      if (tier) {
        // Read the old tier BEFORE writing the update — otherwise the
        // comparison always sees oldTier === newTier.
        // Exhaustive tier ordering — TypeScript enforces all UserTier values
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

          await serverTrack(userId, 'subscription_upgraded', {
            from_tier: oldTier,
            to_tier: tier,
            subscription_id: subscription.id,
            grant_credits: incrementalGrant,
          });
        } else if (newTierRank < oldTierRank) {
          await serverTrack(userId, 'subscription_downgraded', {
            from_tier: oldTier,
            to_tier: tier,
            subscription_id: subscription.id,
          });
        }
        await serverIdentify(userId, { current_tier: tier });
        log.info('Subscription updated', { userId, tier, status: subscription.status });
      }
    }
  }

  // --- Subscription deleted (cancellation, expiry) ---
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as {
      id: string;
      status: string;
      customer: string;
      metadata?: Record<string, string>;
    };

    const userId = subscription.metadata?.userId;
    if (userId) {
      // Read previous tier BEFORE the downgrade for churn analytics
      const db3 = requireDb();
      const [churnedUser] = await db3
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
      await serverTrack(userId, 'subscription_churned', {
        subscription_id: subscription.id,
        previous_tier: previousTier,
      });
      await serverIdentify(userId, { current_tier: 'free' });
      log.info('Subscription deleted, downgraded to free', { userId });
    }
  }

  // --- Invoice payment failed (immediate downgrade) ---
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as {
      id: string;
      customer: string;
      subscription?: string;
      subscription_details?: { metadata?: Record<string, string> };
    };

    // Resolve user from subscription metadata, falling back to DB lookup
    // by stripeCustomerId when metadata isn't propagated on the invoice.
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

    if (userId && invoice.subscription) {
      // Read previous tier BEFORE the downgrade for analytics
      const db4 = requireDb();
      const [failedUser] = await db4
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
      await serverTrack(userId, 'payment_failed', {
        subscription_id: invoice.subscription,
        invoice_id: invoice.id,
        previous_tier: previousTier,
      });
      await serverIdentify(userId, { current_tier: 'free' });
      log.info('Payment failed, downgraded to free', { userId, subscriptionId: invoice.subscription });
    }
  }

  // --- Invoice payment succeeded (restore tier after retry) ---
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as {
      id: string;
      customer: string;
      subscription?: string;
      billing_reason?: string;
      subscription_details?: { metadata?: Record<string, string> };
      lines?: { data: Array<{ price: { id: string } }> };
    };

    // Resolve user from subscription metadata, falling back to DB lookup
    // by stripeCustomerId when metadata isn't propagated on the invoice.
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

    const priceId = invoice.lines?.data[0]?.price.id;

    if (userId && invoice.subscription && priceId) {
      const tier = resolveTierFromPriceId(priceId);
      if (tier) {
        await updateUserSubscription({
          userId,
          tier,
          subscriptionId: invoice.subscription,
          subscriptionStatus: 'active',
          currentPeriodEnd: null, // Will be updated by subscription.updated event
          stripeCustomerId: invoice.customer,
        });

        // Monthly recurring credit grant — only on renewal invoices.
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
    }
  }

  return Response.json({ received: true });
}, 'credits-webhook');
