/**
 * BoutHero — Hero section for replay pages.
 *
 * Shows the "hero quote" from a completed bout: most-reacted turn content,
 * or shareLine, or first transcript entry as fallback chain.
 * Server component for static rendering.
 */

import type { TranscriptEntry } from "@/lib/bouts/types";
import type { ReactionCounts } from "@/lib/engagement/reactions";

interface BoutHeroProps {
  presetName: string;
  agents: Array<{ name: string; color: string }>;
  shareLine: string | null;
  transcript: TranscriptEntry[];
  mostReactedTurn: number | null;
  reactionCounts?: Map<number, ReactionCounts>;
}

export function BoutHero({
  presetName,
  agents,
  shareLine,
  transcript,
  mostReactedTurn,
  reactionCounts,
}: BoutHeroProps) {
  // Determine hero quote using fallback chain:
  // 1. Most-reacted turn content (if exists)
  // 2. Share line (if exists)
  // 3. First transcript entry content
  let heroQuote: string | null = null;
  let heroAgentName: string | null = null;
  let heroAgentColor: string | null = null;
  let heroCounts: ReactionCounts | null = null;

  if (mostReactedTurn !== null && transcript[mostReactedTurn]) {
    const turn = transcript[mostReactedTurn];
    heroQuote = turn.content;
    heroAgentName = turn.agentName;
    heroAgentColor = turn.agentColor;
    heroCounts = reactionCounts?.get(mostReactedTurn) ?? null;
  } else if (shareLine) {
    heroQuote = shareLine;
  } else if (transcript.length > 0) {
    const first = transcript[0];
    heroQuote = first.content;
    heroAgentName = first.agentName;
    heroAgentColor = first.agentColor;
  }

  return (
    <div data-testid="bout-hero" className="mb-8 border-b border-stone-700 pb-8">
      {/* Preset name and agent badges */}
      <h1 className="mb-4 text-2xl font-bold text-stone-100">{presetName}</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        {agents.map((agent) => (
          <span
            key={agent.name}
            className="inline-flex items-center gap-1.5 rounded border border-stone-700 bg-stone-800 px-2 py-1 text-sm"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: agent.color }}
            />
            <span style={{ color: agent.color }}>{agent.name}</span>
          </span>
        ))}
      </div>

      {/* Hero quote */}
      {heroQuote && (
        <blockquote className="relative">
          {heroAgentName && heroAgentColor && (
            <div className="mb-2 flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: heroAgentColor }}
              />
              <span
                className="font-mono text-sm font-bold"
                style={{ color: heroAgentColor }}
              >
                {heroAgentName}
              </span>
            </div>
          )}
          <p
            data-testid="hero-quote"
            className="border-l-4 border-stone-600 pl-4 text-lg italic text-stone-300"
          >
            &ldquo;{heroQuote.length > 280 ? `${heroQuote.slice(0, 280)}...` : heroQuote}&rdquo;
          </p>
          {heroCounts && (heroCounts.heart > 0 || heroCounts.fire > 0) && (
            <div className="mt-3 flex gap-3 pl-4 text-sm text-stone-500">
              {heroCounts.heart > 0 && (
                <span>{"<3"} {heroCounts.heart}</span>
              )}
              {heroCounts.fire > 0 && (
                <span>^ {heroCounts.fire}</span>
              )}
            </div>
          )}
        </blockquote>
      )}
    </div>
  );
}
