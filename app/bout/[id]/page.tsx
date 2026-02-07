import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import { Arena } from '@/components/arena';
import { requireDb } from '@/db';
import { bouts, type TranscriptEntry } from '@/db/schema';
import { PRESETS } from '@/lib/presets';

export const dynamic = 'force-dynamic';

export default async function BoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<{ presetId?: string }> | { presetId?: string };
}) {
  const db = requireDb();
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const presetIdFromQuery =
    typeof resolvedSearchParams?.presetId === 'string'
      ? resolvedSearchParams.presetId
      : null;

  let bout: (typeof bouts.$inferSelect) | undefined;
  try {
    [bout] = await db
      .select()
      .from(bouts)
      .where(eq(bouts.id, resolvedParams.id))
      .limit(1);
  } catch (error) {
    console.error('Failed to load bout', error);
  }

  const resolvedPresetId = bout?.presetId ?? presetIdFromQuery;
  if (!resolvedPresetId) {
    notFound();
  }

  const preset = PRESETS.find((item) => item.id === resolvedPresetId);
  if (!preset) {
    notFound();
  }

  if (!bout && resolvedPresetId) {
    try {
      await db
        .insert(bouts)
        .values({
          id: resolvedParams.id,
          presetId: resolvedPresetId,
          status: 'running',
          transcript: [],
        })
        .onConflictDoNothing();
    } catch (error) {
      console.error('Failed to backfill bout', error);
    }
  }

  const transcript = (bout?.transcript ?? []) as TranscriptEntry[];

  return (
    <Arena
      boutId={resolvedParams.id}
      preset={preset}
      initialTranscript={transcript}
    />
  );
}
