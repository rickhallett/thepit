/**
 * /b/[id] — Short link replay page.
 *
 * Renders completed bout transcripts with hero quote (server-side, per-request).
 * Supports both direct bout IDs (21 chars) and short link slugs (8 chars).
 * Server component — DB queries run per-request, not statically generated.
 */

import { cache } from "react";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { bouts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveShortLink } from "@/lib/sharing/short-links";
import { getReactionCounts, getMostReactedTurnIndex } from "@/lib/engagement/reactions";
// import { getWinnerVoteCounts } from "@/lib/engagement/votes"; // Re-enable when vote display is built
import { getPresetById } from "@/lib/bouts/presets";
import { BoutHero } from "@/components/engagement/bout-hero";
import { Arena } from "@/components/arena/arena";
import type { TranscriptEntry } from "@/lib/bouts/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Resolves the URL param to a bout ID.
 * Short link slugs are 8 chars, bout IDs are 21 chars (nanoid).
 */
async function resolveBoutId(id: string): Promise<string | null> {
  // Short link slugs are 8 chars
  if (id.length === 8) {
    return resolveShortLink(id);
  }
  // Bout IDs are 21 chars — return as-is for direct lookup
  if (id.length === 21) {
    return id;
  }
  // Invalid length
  return null;
}

/**
 * Cached bout lookup — shared between generateMetadata and ReplayPage.
 * React.cache() deduplicates within a single request (Next.js only dedupes fetch()).
 */
const getBout = cache(async (boutId: string) => {
  return db.query.bouts.findFirst({
    where: eq(bouts.id, boutId),
  });
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const boutId = await resolveBoutId(id);

  if (!boutId) {
    return { title: "Not Found | The Pit" };
  }

  const bout = await getBout(boutId);

  if (!bout) {
    return { title: "Not Found | The Pit" };
  }

  const preset = bout.presetId ? getPresetById(bout.presetId) : null;
  const title = preset?.name ?? "Debate";
  const description = bout.shareLine ?? `Watch this AI debate on The Pit`;

  return {
    title: `${title} | The Pit`,
    description,
    openGraph: {
      title: `${title} | The Pit`,
      description,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: `${title} | The Pit`,
      description,
    },
  };
}

export default async function ReplayPage({ params }: PageProps) {
  const { id } = await params;
  const boutId = await resolveBoutId(id);

  if (!boutId) {
    notFound();
  }

  const bout = await getBout(boutId);

  if (!bout) {
    notFound();
  }

  // Only show completed bouts on replay page
  if (bout.status !== "completed") {
    notFound();
  }

  // Fetch engagement data in parallel (winnerVoteCounts removed until vote display is built)
  const [reactionCounts, mostReactedTurn] = await Promise.all([
    getReactionCounts(boutId),
    getMostReactedTurnIndex(boutId),
  ]);

  // Get preset info for display
  const preset = bout.presetId ? getPresetById(bout.presetId) : null;
  const transcript = (bout.transcript as TranscriptEntry[]) ?? [];

  // Extract agent info from transcript or preset
  const agents = preset?.agents.map((a) => ({ name: a.name, color: a.color })) ??
    Array.from(
      new Map(
        transcript.map((t) => [t.agentId, { name: t.agentName, color: t.agentColor }]),
      ).values(),
    );

  // Check if user is signed in (for CTA banner)
  const { userId } = await auth();

  return (
    <div data-testid="replay-page" className="mx-auto max-w-3xl px-4 py-8">
      {/* Hero section */}
      <BoutHero
        presetName={preset?.name ?? "Custom Debate"}
        agents={agents}
        shareLine={bout.shareLine}
        transcript={transcript}
        mostReactedTurn={mostReactedTurn}
        reactionCounts={reactionCounts}
      />

      {/* Arena in read-only mode (reuses existing component) */}
      <Arena
        boutId={boutId}
        initialBout={{
          transcript,
          status: "done",
          shareLine: bout.shareLine,
          presetId: bout.presetId ?? "",
          topic: bout.topic ?? "",
        }}
      />

      {/* CTA banner for signed-out users */}
      {!userId && (
        <div className="mt-8 border-t border-stone-700 pt-8">
          <div className="rounded border border-stone-600 bg-stone-800 p-6 text-center">
            <h2 className="mb-2 text-xl font-bold">Create your own debate</h2>
            <p className="mb-4 text-stone-400">
              Pick a topic, choose your agents, and watch AI battle it out.
            </p>
            <Link
              href="/arena"
              className="inline-block bg-stone-100 px-6 py-3 font-bold text-stone-900 transition-colors hover:bg-white"
            >
              Start a Debate
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
