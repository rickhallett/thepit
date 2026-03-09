"use server";

/**
 * Server actions for the arena page.
 *
 * Handles subscription checkout and credit pack purchases.
 * All actions require authentication and redirect to Stripe.
 */

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import {
  createSubscriptionCheckout,
  createCreditPackCheckout,
} from "@/lib/stripe/checkout";
import { getEnv } from "@/lib/common/env";

// ── Helpers ────────────────────────────────────────────────

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

async function getUserEmail(userId: string): Promise<string> {
  const result = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0]?.email ?? "";
}

// ── Credit pack definitions ────────────────────────────────

const CREDIT_PACKS = {
  small: { credits: 100, micro: 10000, pence: 100 }, // £1 = 100 credits
  medium: { credits: 500, micro: 50000, pence: 500 }, // £5 = 500 credits
} as const;

// ── Subscribe action ───────────────────────────────────────

export async function subscribeAction(formData: FormData): Promise<void> {
  const userId = await requireAuth();
  const tier = formData.get("tier") as string;
  const env = getEnv();

  if (!env.SUBSCRIPTIONS_ENABLED) {
    throw new Error("Subscriptions are not enabled");
  }

  // Validate tier against allowlist — untrusted input from formData.
  // Without this, any value other than "pass" silently subscribes to lab.
  const ALLOWED_TIERS = ["pass", "lab"] as const;
  if (!ALLOWED_TIERS.includes(tier as (typeof ALLOWED_TIERS)[number])) {
    throw new Error(`Unknown subscription tier: ${tier}`);
  }

  const priceId =
    tier === "pass" ? env.STRIPE_PASS_PRICE_ID : env.STRIPE_LAB_PRICE_ID;
  if (!priceId) {
    throw new Error(`No price ID configured for tier: ${tier}`);
  }

  const email = await getUserEmail(userId);
  const appUrl = getAppUrl();

  const url = await createSubscriptionCheckout({
    userId,
    priceId,
    customerEmail: email,
    successUrl: `${appUrl}/arena?subscribed=true`,
    cancelUrl: `${appUrl}/arena`,
  });

  redirect(url);
}

// ── Buy credit pack action ─────────────────────────────────

export async function buyCreditPackAction(formData: FormData): Promise<void> {
  const userId = await requireAuth();
  const pack = formData.get("pack") as string;
  const env = getEnv();

  if (!env.SUBSCRIPTIONS_ENABLED) {
    throw new Error("Subscriptions are not enabled");
  }

  const packConfig = CREDIT_PACKS[pack as keyof typeof CREDIT_PACKS];
  if (!packConfig) {
    throw new Error(`Unknown credit pack: ${pack}`);
  }

  const email = await getUserEmail(userId);
  const appUrl = getAppUrl();

  const url = await createCreditPackCheckout({
    userId,
    creditsMicro: packConfig.micro,
    priceInPence: packConfig.pence,
    customerEmail: email,
    successUrl: `${appUrl}/arena?purchased=true`,
    cancelUrl: `${appUrl}/arena`,
  });

  redirect(url);
}
