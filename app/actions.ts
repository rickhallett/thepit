'use server';

import { nanoid } from 'nanoid';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { agents, bouts, users } from '@/db/schema';
import { isAdmin } from '@/lib/admin';
import { ARENA_PRESET_ID, getPresetById } from '@/lib/presets';
import {
  applyCreditDelta,
  CREDITS_ADMIN_ENABLED,
  CREDITS_ADMIN_GRANT,
  MICRO_PER_CREDIT,
} from '@/lib/credits';
import { ensureUserRecord } from '@/lib/users';
import { CREDIT_PACKAGES } from '@/lib/credit-catalog';
import { stripe } from '@/lib/stripe';
import { getAgentSnapshots } from '@/lib/agent-registry';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/tier';
import {
  DEFAULT_RESPONSE_LENGTH,
  resolveResponseLength,
} from '@/lib/response-lengths';
import {
  DEFAULT_RESPONSE_FORMAT,
  resolveResponseFormat,
} from '@/lib/response-formats';
import { resolveTurns } from '@/lib/turns';
import { getFormString } from '@/lib/form-utils';
import { log } from '@/lib/logger';
import { env } from '@/lib/env';

/**
 * Resolve the app URL for redirects (e.g. Stripe checkout success/cancel).
 *
 * Falls back to localhost only in development. In production, a missing
 * URL configuration is a deployment error — fail fast rather than
 * redirecting Stripe customers to localhost.
 */
function getAppUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL;

  if (url) return url;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Missing app URL configuration. Set NEXT_PUBLIC_APP_URL, APP_URL, or NEXT_PUBLIC_SITE_URL.',
    );
  }

  return 'http://localhost:3000';
}

/** Create a bout record and redirect to its streaming page. */
export async function createBout(presetId: string, formData?: FormData) {
  if (!getPresetById(presetId)) {
    redirect('/arena');
  }

  const { userId } = await auth();

  // Require authentication unless demo mode is enabled.
  // Demo mode lets anonymous visitors run bouts without signing up —
  // the bout engine handles anonymous users via intro pool + IP rate limiting.
  if (!userId && !env.DEMO_MODE_ENABLED) {
    redirect('/sign-up?redirect_url=/arena');
  }

  const db = requireDb();
  const id = nanoid();
  const topic = getFormString(formData, 'topic');
  const model = getFormString(formData, 'model');
  const length = getFormString(formData, 'length');
  const format = getFormString(formData, 'format');
  const lengthConfig = resolveResponseLength(length);
  const formatConfig = resolveResponseFormat(format);

  if (userId) {
    await ensureUserRecord(userId);
  }

  await db.insert(bouts).values({
    id,
    presetId,
    status: 'running',
    transcript: [],
    ownerId: userId ?? null,
    topic: topic ?? null,
    responseLength: lengthConfig.id,
    responseFormat: formatConfig.id,
  });

  const params = new URLSearchParams({ presetId });
  if (topic) {
    params.set('topic', topic);
  }
  if (model) {
    params.set('model', model);
  }
  if (length) {
    params.set('length', length);
  }
  if (format) {
    params.set('format', format);
  }
  redirect(`/bout/${id}?${params.toString()}`);
}

/** Create an arena-mode bout with a custom agent lineup and redirect to the bout page. */
export async function createArenaBout(formData: FormData) {
  const { userId } = await auth();

  // Require authentication unless demo mode is enabled.
  if (!userId && !env.DEMO_MODE_ENABLED) {
    redirect('/sign-in?redirect_url=/arena/custom');
  }

  const agentIds = formData.getAll('agentIds').filter(Boolean) as string[];
  const topic = getFormString(formData, 'topic');
  const length = getFormString(formData, 'length');
  const format = getFormString(formData, 'format');
  const model = getFormString(formData, 'model');
  const turns = getFormString(formData, 'turns');
  const lengthConfig = resolveResponseLength(length || DEFAULT_RESPONSE_LENGTH);
  const formatConfig = resolveResponseFormat(format || DEFAULT_RESPONSE_FORMAT);
  const maxTurns = resolveTurns(turns);

  if (agentIds.length < 2 || agentIds.length > 6) {
    throw new Error('Select between 2 and 6 agents.');
  }

  const snapshots = await getAgentSnapshots();
  const lineup = agentIds
    .map((id) => snapshots.find((agent) => agent.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .map((agent) => ({
      id: agent.id,
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      color: agent.color,
      avatar: agent.avatar,
    }));

  if (lineup.length !== agentIds.length) {
    throw new Error('One or more agents could not be found.');
  }

  if (userId) {
    await ensureUserRecord(userId);
  }

  const db = requireDb();
  const id = nanoid();
  await db.insert(bouts).values({
    id,
    presetId: ARENA_PRESET_ID,
    status: 'running',
    transcript: [],
    ownerId: userId ?? null,
    topic: topic || null,
    responseLength: lengthConfig.id,
    responseFormat: formatConfig.id,
    maxTurns,
    agentLineup: lineup,
  });

  const params = new URLSearchParams();
  if (model) {
    params.set('model', model);
  }
  const query = params.toString();
  redirect(query ? `/bout/${id}?${query}` : `/bout/${id}`);
}

/** Create a Stripe Checkout session for a one-time credit pack purchase. */
export async function createCreditCheckout(formData: FormData) {
  const packId = getFormString(formData, 'packId');
  const pack = CREDIT_PACKAGES.find((item) => item.id === packId);

  if (!pack) {
    throw new Error('Invalid credit pack.');
  }

  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in?redirect_url=/arena');
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Payment service unavailable.');
  }

  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'gbp',
          unit_amount: Math.round(pack.priceGbp * 100),
          product_data: {
            name: `THE PIT — ${pack.name} Credits`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      packId: pack.id,
      credits: pack.credits.toString(),
    },
    success_url: `${appUrl}/arena?checkout=success`,
    cancel_url: `${appUrl}/arena?checkout=cancel`,
  });

  if (!session.url) {
    throw new Error('Failed to create checkout session.');
  }

  redirect(session.url);
}

/** Grant test credits to the current user (admin-only). */
export async function grantTestCredits() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in?redirect_url=/arena');
  }
  if (!isAdmin(userId)) {
    throw new Error('Unauthorized.');
  }
  if (!CREDITS_ADMIN_ENABLED) {
    throw new Error('Admin credits disabled.');
  }

  await ensureUserRecord(userId);

  const deltaMicro = Math.round(CREDITS_ADMIN_GRANT * MICRO_PER_CREDIT);
  await applyCreditDelta(userId, deltaMicro, 'admin_grant', {
    admin: true,
    credits: CREDITS_ADMIN_GRANT,
  });

  log.info('audit', { action: 'grant_test_credits', userId, credits: CREDITS_ADMIN_GRANT });
  redirect('/arena?credits=granted');
}

/** Mark an agent as archived (admin-only). */
export async function archiveAgent(agentId: string) {
  const { userId } = await auth();
  if (!isAdmin(userId ?? null)) {
    throw new Error('Unauthorized.');
  }

  const db = requireDb();
  await db
    .update(agents)
    .set({ archived: true })
    .where(eq(agents.id, agentId));

  log.info('audit', { action: 'archive_agent', userId, agentId });
  revalidatePath(`/agents/${encodeURIComponent(agentId)}`);
}

/** Restore an archived agent (admin-only). */
export async function restoreAgent(agentId: string) {
  const { userId } = await auth();
  if (!isAdmin(userId ?? null)) {
    throw new Error('Unauthorized.');
  }

  const db = requireDb();
  await db
    .update(agents)
    .set({ archived: false })
    .where(eq(agents.id, agentId));

  log.info('audit', { action: 'restore_agent', userId, agentId });
  revalidatePath(`/agents/${encodeURIComponent(agentId)}`);
}

/**
 * Get or create a Stripe customer for a user.
 *
 * Resolves in this order to avoid duplicate customers under concurrency:
 *   1. Return stripeCustomerId from the users table if already stored.
 *   2. Search Stripe for an existing customer with matching userId metadata.
 *   3. Create a new Stripe customer and persist the ID.
 */
async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const db = requireDb();
  const [user] = await db
    .select({
      stripeCustomerId: users.stripeCustomerId,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.stripeCustomerId) return user.stripeCustomerId;

  // Guard against race conditions: check Stripe for an existing customer
  // created by a concurrent request before our DB write completed.
  const existing = await stripe.customers.search({
    query: `metadata["userId"]:"${userId}"`,
    limit: 1,
  });

  if (existing.data.length > 0) {
    const customerId = existing.data[0]!.id;
    await db
      .update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return customerId;
  }

  const customer = await stripe.customers.create({
    metadata: { userId },
    ...(user?.email ? { email: user.email } : {}),
  });

  await db
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return customer.id;
}

/**
 * Create a Stripe Checkout session for a subscription plan.
 * Redirects the user to Stripe's hosted checkout page.
 */
export async function createSubscriptionCheckout(formData: FormData) {
  if (!SUBSCRIPTIONS_ENABLED) {
    throw new Error('Subscriptions not enabled.');
  }

  const plan = formData?.get('plan');
  if (plan !== 'pass' && plan !== 'lab') {
    throw new Error('Invalid plan.');
  }

  const priceId =
    plan === 'pass'
      ? process.env.STRIPE_PASS_PRICE_ID
      : process.env.STRIPE_LAB_PRICE_ID;

  if (!priceId) {
    throw new Error('Subscription plan not configured.');
  }

  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in?redirect_url=/arena');
  }

  await ensureUserRecord(userId);
  const customerId = await getOrCreateStripeCustomer(userId);

  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId, plan },
    subscription_data: {
      metadata: { userId, plan },
    },
    success_url: `${appUrl}/arena?subscription=success`,
    cancel_url: `${appUrl}/arena?subscription=cancel`,
  });

  if (!session.url) {
    throw new Error('Failed to create checkout session.');
  }

  redirect(session.url);
}

/**
 * Create a Stripe Billing Portal session for managing subscriptions.
 * Redirects the user to Stripe's self-service portal where they can
 * upgrade, downgrade, cancel, or update payment methods.
 */
export async function createBillingPortal() {
  if (!SUBSCRIPTIONS_ENABLED) {
    throw new Error('Subscriptions not enabled.');
  }

  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in?redirect_url=/arena');
  }

  await ensureUserRecord(userId);
  const customerId = await getOrCreateStripeCustomer(userId);

  const appUrl = getAppUrl();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/arena`,
  });

  redirect(session.url);
}


