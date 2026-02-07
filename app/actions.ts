'use server';

import { nanoid } from 'nanoid';
import { redirect } from 'next/navigation';

import { requireDb } from '@/db';
import { bouts } from '@/db/schema';
import { PRESETS } from '@/lib/presets';

export async function createBout(presetId: string) {
  const presetExists = PRESETS.some((preset) => preset.id === presetId);
  if (!presetExists) {
    throw new Error('Invalid preset.');
  }

  const db = requireDb();
  const id = nanoid();

  try {
    await db.insert(bouts).values({
      id,
      presetId,
      status: 'running',
      transcript: [],
    });
  } catch (error) {
    console.error('createBout insert failed', error);
  }

  redirect(`/bout/${id}?presetId=${encodeURIComponent(presetId)}`);
}
