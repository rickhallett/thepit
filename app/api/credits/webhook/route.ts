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
} from '@/lib/credits';
import { stripe } from '@/lib/stripe';
import { resolveTierFromPriceId, type UserTier } from '@/lib/tier';
import { serverTrack, serverIdentify, flushServerAnalytics } from '@/lib/posthog-server';

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

function identifySubscriptionState(params: {
  userId: string;
  tier: UserTier;
  subscriptionStatus: string;
  subscriptionId: string;
  stripeCustomerId: string | null;
  currentPeriodEnd: Date | null;
}) {
  serverIdentify(params.userId, {
    current_tier: params.tier,
    subscription_status: params.subscriptionStatus,
    subscription_id: params.subscriptionId,
    stripe_customer_id: params.stripeCustomerId,
    subscription_current_period_end: params.currentPeriodEnd
      ? params.currentPeriodEnd.toISOString()
      : null,
  });
}

/**
 * Handle Stripe webhook events for credit purchases and subscription lifecycle.
 *
 * Idempotency:
 * - checkout.session.completed: guarded by creditTransactions.referenceId lookup.
 * - Subscription/invoice events: naturally idempotent — updateUserSubscription
 *   is a SET (not increment), so replayed events write the same values.
 *   Out-of-order delivery is mitigated by Stripe's per-object ordering.
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
        serverTrack(userId, 'credit_purchase_completed', {
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
        serverTrack(userId, 'subscription_started', {
          tier,
          subscription_id: subscription.id,
          status: subscription.status,
        });
        identifySubscriptionState({
          userId,
          tier,
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          stripeCustomerId: subscription.customer,
          currentPeriodEnd: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
        });
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
          serverTrack(userId, 'subscription_upgraded', {
            from_tier: oldTier,
            to_tier: tier,
            subscription_id: subscription.id,
          });
        } else if (newTierRank < oldTierRank) {
          serverTrack(userId, 'subscription_downgraded', {
            from_tier: oldTier,
            to_tier: tier,
            subscription_id: subscription.id,
          });
        }
        identifySubscriptionState({
          userId,
          tier,
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          stripeCustomerId: subscription.customer,
          currentPeriodEnd: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
        });
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
      // Immediate downgrade to free
      await updateUserSubscription({
        userId,
        tier: 'free',
        subscriptionId: subscription.id,
        subscriptionStatus: 'canceled',
        currentPeriodEnd: null,
        stripeCustomerId: subscription.customer,
      });
      serverTrack(userId, 'subscription_churned', {
        subscription_id: subscription.id,
      });
      identifySubscriptionState({
        userId,
        tier: 'free',
        subscriptionId: subscription.id,
        subscriptionStatus: 'canceled',
        stripeCustomerId: subscription.customer,
        currentPeriodEnd: null,
      });
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
      await updateUserSubscription({
        userId,
        tier: 'free',
        subscriptionId: invoice.subscription,
        subscriptionStatus: 'past_due',
        currentPeriodEnd: null,
        stripeCustomerId: invoice.customer,
      });
      serverTrack(userId, 'payment_failed', {
        subscription_id: invoice.subscription,
        invoice_id: invoice.id,
      });
      identifySubscriptionState({
        userId,
        tier: 'free',
        subscriptionId: invoice.subscription,
        subscriptionStatus: 'past_due',
        stripeCustomerId: invoice.customer,
        currentPeriodEnd: null,
      });
      log.info('Payment failed, downgraded to free', { userId, subscriptionId: invoice.subscription });
    }
  }

  // --- Invoice payment succeeded (restore tier after retry) ---
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as {
      id: string;
      customer: string;
      subscription?: string;
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
        identifySubscriptionState({
          userId,
          tier,
          subscriptionId: invoice.subscription,
          subscriptionStatus: 'active',
          stripeCustomerId: invoice.customer,
          currentPeriodEnd: null,
        });
        log.info('Payment succeeded, tier restored', { userId, tier });
      }
    }
  }

  // Flush server-side analytics before the serverless function terminates.
  // Wrapped in try-catch so a PostHog SDK/network error doesn't turn a
  // successful webhook into a 500, which would trigger Stripe retries.
  try {
    await flushServerAnalytics();
  } catch {
    // Best-effort — analytics loss is acceptable, webhook failure is not.
  }

  return Response.json({ received: true });
}, 'credits-webhook');
