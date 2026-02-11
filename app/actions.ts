'use server';

import { nanoid } from 'nanoid';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { agents, bouts } from '@/db/schema';
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
import {
  DEFAULT_RESPONSE_LENGTH,
  resolveResponseLength,
} from '@/lib/response-lengths';
import {
  DEFAULT_RESPONSE_FORMAT,
  resolveResponseFormat,
} from '@/lib/response-formats';
import { getFormString } from '@/lib/form-utils';

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

export async function createArenaBout(formData: FormData) {
  const { userId } = await auth();
  if (CREDITS_ENABLED && !userId) {
    redirect('/sign-in?redirect_url=/arena/custom');
  }

  const agentIds = formData.getAll('agentIds').filter(Boolean) as string[];
  const topic = getFormString(formData, 'topic');
  const length = getFormString(formData, 'length');
  const format = getFormString(formData, 'format');
  const model = getFormString(formData, 'model');
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
