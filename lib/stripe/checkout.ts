/**
 * lib/stripe/checkout.ts — Stripe checkout session creation.
 *
 * Creates checkout sessions for subscriptions and credit pack purchases.
 * Metadata on sessions must match webhook handler expectations:
 * - Subscriptions: metadata.userId (set on subscription via SDK)
 * - Credit packs: metadata.userId, metadata.creditsMicro
 */

import Stripe from "stripe";
import { getEnv } from "@/lib/common/env";

function getStripe(): Stripe {
  const env = getEnv();
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is required");
  }
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });
}

// ── Subscription checkout ────────────────────────────────────

export interface SubscriptionCheckoutParams {
  userId: string;
  priceId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create a Stripe checkout session for a subscription.
 * The userId is stored in subscription_data.metadata so the webhook
 * can associate the subscription with our user.
 * @returns Checkout session URL to redirect the user to
 */
export async function createSubscriptionCheckout(
  params: SubscriptionCheckoutParams,
): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: params.customerEmail || undefined,
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    subscription_data: {
      metadata: { userId: params.userId },
    },
  });

  if (!session.url) {
    throw new Error("Stripe checkout session created without URL");
  }

  return session.url;
}

// ── Credit pack checkout ────────────────────────────────────

export interface CreditPackCheckoutParams {
  userId: string;
  creditsMicro: number;
  priceInPence: number;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create a Stripe checkout session for a one-time credit pack purchase.
 * Metadata includes userId and creditsMicro for the webhook handler.
 * @returns Checkout session URL to redirect the user to
 */
export async function createCreditPackCheckout(
  params: CreditPackCheckoutParams,
): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.customerEmail || undefined,
    line_items: [
      {
        price_data: {
          currency: "gbp",
          unit_amount: params.priceInPence,
          product_data: { name: "Credit Pack" },
        },
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      userId: params.userId,
      creditsMicro: String(params.creditsMicro),
    },
  });

  if (!session.url) {
    throw new Error("Stripe checkout session created without URL");
  }

  return session.url;
}

// ── Billing portal ────────────────────────────────────────

export interface BillingPortalParams {
  customerId: string;
  returnUrl: string;
}

/**
 * Create a Stripe billing portal session for subscription management.
 * @returns Billing portal URL to redirect the user to
 */
export async function createBillingPortal(
  params: BillingPortalParams,
): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  return session.url;
}
