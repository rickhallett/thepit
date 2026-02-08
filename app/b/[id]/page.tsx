import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import { Arena } from '@/components/arena';
import { requireDb } from '@/db';
import { bouts, type TranscriptEntry } from '@/db/schema';
import { ALL_PRESETS } from '@/lib/presets';

export const dynamic = 'force-dynamic';

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const db = requireDb();
  const resolved = await params;
  const [bout] = await db
    .select()
    .from(bouts)
    .where(eq(bouts.id, resolved.id))
    .limit(1);

  if (!bout) {
    notFound();
  }

  const preset = ALL_PRESETS.find((item) => item.id === bout.presetId);
  if (!preset) {
    notFound();
  }

  return (
    <Arena
      boutId={resolved.id}
      preset={preset}
      initialTranscript={(bout.transcript ?? []) as TranscriptEntry[]}
      shareLine={bout.shareLine}
    />
  );
}
