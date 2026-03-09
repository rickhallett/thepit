// Bout page — renders completed bouts statically or streams live bouts.
// Server component that fetches bout from DB, passes to Arena client component.
// Reads searchParams for auto-start when navigating from /arena.

import { db } from "@/db";
import { bouts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Arena } from "@/components/arena/arena";
import type { TranscriptEntry } from "@/lib/bouts/types";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ presetId?: string; topic?: string; model?: string }>;
}

export default async function BoutPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const search = await searchParams;

  const bout = await db.query.bouts.findFirst({
    where: eq(bouts.id, id),
  });

  // If bout exists and is completed, Arena renders static transcript.
  // If bout doesn't exist, this is a new bout — Arena renders in streaming mode.
  // The boutId comes from URL params (client generates nanoid before navigating here).

  if (bout && bout.status === "error") {
    // Show error state for failed bouts
    return (
      <div className="mx-auto max-w-2xl py-8">
        <h1 className="text-2xl font-black">Bout Failed</h1>
        <p className="mt-2 text-stone-400">
          This bout encountered an error and could not be completed.
        </p>
      </div>
    );
  }

  // Map DB status to Arena display status.
  // DB: running|completed|error → Arena: streaming|done|error
  const dbStatus = bout?.status;
  const displayStatus =
    dbStatus === "completed" ? "done" : dbStatus === "running" ? "streaming" : dbStatus ?? "idle";

  // Auto-start config from query params (when navigating from /arena).
  const autoStart = search.presetId
    ? { presetId: search.presetId, topic: search.topic, model: search.model }
    : undefined;

  return (
    <Arena
      boutId={id}
      initialBout={
        bout
          ? {
              transcript: bout.transcript as TranscriptEntry[] | null,
              status: displayStatus,
              shareLine: bout.shareLine,
              presetId: bout.presetId ?? "",
              topic: bout.topic ?? "",
            }
          : null
      }
      autoStart={autoStart}
    />
  );
}
