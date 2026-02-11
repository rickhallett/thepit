'use server';

import { nanoid } from 'nanoid';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { agents, bouts, users } from '@/db/schema';
import { isAdmin } from '@/lib/admin';
import { ARENA_PRESET_ID, PRESETS } from '@/lib/presets';
import {
  applyCreditDelta,
  CREDITS_ADMIN_ENABLED,
  CREDITS_ADMIN_GRANT,
  CREDITS_ENABLED,
  MICRO_PER_CREDIT,
} from '@/lib/credits';
import { ensureUserRecord } from '@/lib/users';
import { CREDIT_PACKAGES } from '@/lib/credit-catalog';
import { stripe } from '@/lib/stripe';
import { getAgentSnapshots } from '@/lib/agent-registry';
import { SUBSCRIPTIONS_ENABLED, type UserTier } from '@/lib/tier';
import {
  DEFAULT_RESPONSE_LENGTH,
  resolveResponseLength,
} from '@/lib/response-lengths';
import {
  DEFAULT_RESPONSE_FORMAT,
  resolveResponseFormat,
} from '@/lib/response-formats';

export async function createBout(presetId: string, formData?: FormData) {
  const presetExists = PRESETS.some((preset) => preset.id === presetId);
  if (!presetExists) {
    throw new Error('Invalid preset.');
  }

  const { userId } = await auth();
  if (CREDITS_ENABLED && !userId) {
    redirect('/sign-in?redirect_url=/arena');
  }

  const db = requireDb();
  const id = nanoid();
  const topic =
    formData?.get('topic') && typeof formData.get('topic') === 'string'
      ? String(formData.get('topic')).trim()
      : '';
  const model =
    formData?.get('model') && typeof formData.get('model') === 'string'
      ? String(formData.get('model')).trim()
      : '';
  const length =
    formData?.get('length') && typeof formData.get('length') === 'string'
      ? String(formData.get('length')).trim()
      : '';
  const format =
    formData?.get('format') && typeof formData.get('format') === 'string'
      ? String(formData.get('format')).trim()
      : '';
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

export async function createArenaBout(formData: FormData) {
  const { userId } = await auth();
  if (CREDITS_ENABLED && !userId) {
    redirect('/sign-in?redirect_url=/arena/custom');
  }

  const agentIds = formData.getAll('agentIds').filter(Boolean) as string[];
  const topic =
    formData?.get('topic') && typeof formData.get('topic') === 'string'
      ? String(formData.get('topic')).trim()
      : '';
  const length =
    formData?.get('length') && typeof formData.get('length') === 'string'
      ? String(formData.get('length')).trim()
      : '';
  const format =
    formData?.get('format') && typeof formData.get('format') === 'string'
      ? String(formData.get('format')).trim()
      : '';
  const model =
    formData?.get('model') && typeof formData.get('model') === 'string'
      ? String(formData.get('model')).trim()
      : '';
  const lengthConfig = resolveResponseLength(length || DEFAULT_RESPONSE_LENGTH);
  const formatConfig = resolveResponseFormat(format || DEFAULT_RESPONSE_FORMAT);

  if (agentIds.length < 2 || agentIds.length > 6) {
    throw new Error('Select between 2 and 6 agents.');
  }

  const snapshots = await getAgentSnapshots();
  const lineup = agentIds
    .map((id) => snapshots.find((agent) => agent.id === id))
    .filter(Boolean)
    .map((agent) => ({
      id: agent!.id,
      name: agent!.name,
      systemPrompt: agent!.systemPrompt,
      color: agent!.color,
      avatar: agent!.avatar,
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
    agentLineup: lineup,
  });

  const params = new URLSearchParams();
  if (model) {
    params.set('model', model);
  }
  const query = params.toString();
  redirect(query ? `/bout/${id}?${query}` : `/bout/${id}`);
}

export async function createCreditCheckout(formData: FormData) {
  const packId =
    formData?.get('packId') && typeof formData.get('packId') === 'string'
      ? String(formData.get('packId')).trim()
      : '';
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

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    'http://localhost:3000';

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

export async function grantTestCredits() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in?redirect_url=/arena');
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

  redirect('/arena?credits=granted');
}

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

  revalidatePath(`/agents/${encodeURIComponent(agentId)}`);
}

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

  revalidatePath(`/agents/${encodeURIComponent(agentId)}`);
}

/**
 * Get or create a Stripe customer for a user.
 * Stores the customer ID on the users table to avoid duplicate customers.
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

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    'http://localhost:3000';

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

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    'http://localhost:3000';

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/arena`,
  });

  redirect(session.url);
}


