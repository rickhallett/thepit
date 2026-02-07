'use server';

import { nanoid } from 'nanoid';
import { redirect } from 'next/navigation';

import { requireDb } from '@/db';
import { bouts } from '@/db/schema';
import { PRESETS } from '@/lib/presets';

export async function createBout(presetId: string, formData?: FormData) {
  const presetExists = PRESETS.some((preset) => preset.id === presetId);
  if (!presetExists) {
    throw new Error('Invalid preset.');
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
