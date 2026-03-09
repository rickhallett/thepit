/**
 * lib/stripe/webhook.ts — Stripe webhook event handlers.
 *
 * Handles 6 event types for credit grants and subscription management.
 * All credit grants are idempotent via reference_id in credit_transactions.
 */

import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, creditTransactions } from "@/db/schema";
import { applyCreditDelta } from "@/lib/credits/balance";
import { CreditSource } from "@/lib/credits/types";
import { resolveTierFromPriceId, TIER_CONFIG, UserTier } from "./tier";

// ── Idempotency helper ────────────────────────────────────

async function hasProcessedReference(referenceId: string): Promise<boolean> {
  const existing = await db
    .select({ id: creditTransactions.id })
    .from(creditTransactions)
    .where(eq(creditTransactions.referenceId, referenceId))
    .limit(1);
  return existing.length > 0;
}

// ── Event handlers ────────────────────────────────────────

/**
 * checkout.session.completed — Credit pack purchase.
 * Extracts userId and creditsMicro from session metadata.
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId;
  const creditsMicro = session.metadata?.creditsMicro;

  if (!userId || !creditsMicro) {
    // Not a credit pack purchase, ignore
    return;
  }

  const referenceId = `purchase:${session.id}`;
  if (await hasProcessedReference(referenceId)) {
    return; // Already processed
  }

  await applyCreditDelta(
    userId,
    parseInt(creditsMicro, 10),
    CreditSource.PURCHASE,
    referenceId,
  );
}

/**
 * customer.subscription.created — New subscription.
 * Updates user tier and applies one-time subscription grant.
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) {
    return;
  }

  const tier = resolveTierFromPriceId(priceId);
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  // Update user subscription fields
  await db
    .update(users)
    .set({
      subscriptionTier: tier,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      stripeCustomerId: customerId,
    })
    .where(eq(users.id, userId));

  // Apply one-time grant (idempotent)
  const grantMicro = TIER_CONFIG[tier].grantMicro;
  if (grantMicro > 0) {
    const referenceId = `sub_grant:${subscription.id}`;
    if (!(await hasProcessedReference(referenceId))) {
      await applyCreditDelta(
        userId,
        grantMicro,
        CreditSource.SUBSCRIPTION_GRANT,
        referenceId,
      );
    }
  }
}

/**
 * customer.subscription.updated — Upgrade/downgrade.
 * Updates tier and applies incremental grant on upgrade.
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) {
    return;
  }

  const newTier = resolveTierFromPriceId(priceId);

  // Get current tier from DB
  const userRow = await db
    .select({ subscriptionTier: users.subscriptionTier })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const oldTier = (userRow[0]?.subscriptionTier as UserTier) ?? UserTier.FREE;

  // Update user tier
  await db
    .update(users)
    .set({
      subscriptionTier: newTier,
      subscriptionStatus: subscription.status,
    })
    .where(eq(users.id, userId));

  // If upgrade, apply incremental grant
  const oldGrant = TIER_CONFIG[oldTier].grantMicro;
  const newGrant = TIER_CONFIG[newTier].grantMicro;
  const incrementalGrant = newGrant - oldGrant;

  if (incrementalGrant > 0) {
    const referenceId = `upgrade_grant:${subscription.id}:${newTier}`;
    if (!(await hasProcessedReference(referenceId))) {
      await applyCreditDelta(
        userId,
        incrementalGrant,
        CreditSource.SUBSCRIPTION_GRANT,
        referenceId,
      );
    }
  }
}

/**
 * customer.subscription.deleted — Cancellation.
 * Downgrades to free tier, no credit clawback.
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    return;
  }

  await db
    .update(users)
    .set({
      subscriptionTier: UserTier.FREE,
      subscriptionStatus: "canceled",
      subscriptionId: null,
    })
    .where(eq(users.id, userId));
}

/**
 * invoice.payment_failed — Immediate downgrade.
 * Finds user by stripe_customer_id and downgrades to free.
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) {
    return;
  }

  await db
    .update(users)
    .set({
      subscriptionTier: UserTier.FREE,
      subscriptionStatus: "past_due",
    })
    .where(eq(users.stripeCustomerId, customerId));
}

/**
 * invoice.payment_succeeded — Monthly grant.
 * Skips first invoice (grant already applied by subscription.created).
 * Restores tier if was downgraded due to payment failure.
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  // Skip first invoice — grant already applied by subscription.created
  if (invoice.billing_reason === "subscription_create") {
    return;
  }

  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) {
    return;
  }

  // Resolve tier from the invoice's subscription price, NOT from the DB.
  // If payment previously failed, handlePaymentFailed already set tier to 'free'.
  // Reading tier from DB here would grant free-tier credits (0) instead of the
  // actual subscription tier credits. The invoice's line items carry the truth.
  const subscriptionLineItem = invoice.lines?.data?.[0];
  const priceDetails = subscriptionLineItem?.pricing?.price_details;
  const priceId =
    typeof priceDetails?.price === "string"
      ? priceDetails.price
      : priceDetails?.price?.id;

  // Find user by stripe_customer_id
  const userRow = await db
    .select({
      id: users.id,
      subscriptionId: users.subscriptionId,
    })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (userRow.length === 0) {
    return;
  }

  const user = userRow[0];

  // Resolve tier from price ID (falls back to free if price ID unknown)
  const tier = priceId ? resolveTierFromPriceId(priceId) : UserTier.FREE;
  const grantMicro = TIER_CONFIG[tier].grantMicro;

  // Apply monthly grant (idempotent)
  if (grantMicro > 0) {
    const referenceId = `monthly:${invoice.id}`;
    if (!(await hasProcessedReference(referenceId))) {
      await applyCreditDelta(
        user.id,
        grantMicro,
        CreditSource.MONTHLY_GRANT,
        referenceId,
      );
    }
  }

  // Restore tier AND active status. This handles the payment recovery case:
  // payment_failed set tier=free + status=past_due → payment_succeeded
  // restores both to the correct values.
  await db
    .update(users)
    .set({
      subscriptionTier: tier,
      subscriptionStatus: "active",
    })
    .where(eq(users.stripeCustomerId, customerId));
}

// ── Main dispatcher ───────────────────────────────────────

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  try {
    switch (event.type) {
      case "checkout.session.completed":
        return await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
      case "customer.subscription.created":
        return await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription,
        );
      case "customer.subscription.updated":
        return await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
      case "customer.subscription.deleted":
        return await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
      case "invoice.payment_failed":
        return await handlePaymentFailed(event.data.object as Stripe.Invoice);
      case "invoice.payment_succeeded":
        return await handlePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        );
      default:
        // Ignore unknown events
        return;
    }
  } catch (error) {
    console.error(
      `[webhook] Error handling ${event.type} (${event.id}):`,
      error,
    );

    // Distinguish transient vs persistent errors.
    // Transient (DB timeouts, network): re-throw so route returns 500 → Stripe retries.
    // Persistent (unique constraint, bad data): swallow so route returns 200 → no infinite retry.
    const isPersistent =
      error instanceof Error &&
      (error.message.includes("unique") ||
        error.message.includes("duplicate") ||
        error.message.includes("violates") ||
        error.message.includes("invalid") ||
        error.message.includes("Unknown Stripe price ID"));

    if (!isPersistent) {
      throw error;
    }
    // Persistent error: swallowed. Stripe gets 200, won't retry.
  }
}
