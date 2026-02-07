'use server';

import { nanoid } from 'nanoid';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import { requireDb } from '@/db';
import { bouts } from '@/db/schema';
import { PRESETS } from '@/lib/presets';
import { CREDITS_ENABLED } from '@/lib/credits';
import { ensureUserRecord } from '@/lib/users';

export async function createBout(presetId: string, formData?: FormData) {
  const presetExists = PRESETS.some((preset) => preset.id === presetId);
  if (!presetExists) {
    throw new Error('Invalid preset.');
  }

  const { userId } = await auth();
  if (CREDITS_ENABLED && !userId) {
    redirect('/sign-in?redirect_url=/');
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
