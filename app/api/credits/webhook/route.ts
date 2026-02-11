import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { creditTransactions, users } from '@/db/schema';
import {
  applyCreditDelta,
  ensureCreditAccount,
  MICRO_PER_CREDIT,
} from '@/lib/credits';
import { stripe } from '@/lib/stripe';
import { resolveTierFromPriceId, type UserTier } from '@/lib/tier';

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

/** Handle Stripe webhook events for credit purchases and subscription lifecycle. */
export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response('Service unavailable.', { status: 500 });
  }

  const body = await req.text();
  const headerList = await headers();
  const signature = headerList.get('stripe-signature');
  if (!signature) {
    return new Response('Missing signature.', { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.warn('Stripe webhook signature failed', error);
    return new Response('Invalid signature.', { status: 400 });
  }

  // --- Credit pack purchase (one-time checkout) ---
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      id: string;
      mode?: string;
      metadata?: Record<string, string>;
    };

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
      }

      if (existing) {
        console.log(`Webhook: Duplicate session ${session.id}, skipping`);
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
        console.log(
          `Subscription created: user=${userId} tier=${tier} sub=${subscription.id}`,
        );
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
        console.log(
          `Subscription updated: user=${userId} tier=${tier} status=${subscription.status}`,
        );
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
      console.log(`Subscription deleted: user=${userId} downgraded to free`);
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
      console.log(
        `Payment failed: user=${userId} sub=${invoice.subscription} downgraded to free`,
      );
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
        console.log(
          `Payment succeeded: user=${userId} tier=${tier} restored`,
        );
      }
    }
  }

  return Response.json({ received: true });
}
