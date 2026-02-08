'use server';

import { nanoid } from 'nanoid';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import { requireDb } from '@/db';
import { bouts } from '@/db/schema';
import { PRESETS } from '@/lib/presets';
import { CREDITS_ENABLED } from '@/lib/credits';
import { ensureUserRecord } from '@/lib/users';
import { CREDIT_PACKAGES } from '@/lib/credit-catalog';
import { stripe } from '@/lib/stripe';
import { getAgentSnapshots } from '@/lib/agent-registry';
import { DEFAULT_RESPONSE_LENGTH, resolveResponseLength } from '@/lib/response-lengths';

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
  const lengthConfig = resolveResponseLength(length);

  if (userId) {
    await ensureUserRecord(userId);
  }

  try {
    await db.insert(bouts).values({
      id,
      presetId,
      status: 'running',
      transcript: [],
      ownerId: userId ?? null,
      topic: topic || null,
      responseLength: lengthConfig.id,
    });
  } catch (error) {
    console.error('createBout insert failed', error);
  }

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
  const lengthConfig = resolveResponseLength(length || DEFAULT_RESPONSE_LENGTH);

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
    presetId: 'arena',
    status: 'running',
    transcript: [],
    ownerId: userId ?? null,
    topic: topic || null,
    responseLength: lengthConfig.id,
    agentLineup: lineup,
  });

  redirect(`/bout/${id}`);
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
    throw new Error('Stripe not configured.');
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
