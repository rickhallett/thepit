// Shared OG image renderer for bout replay pages.
// Used by both /bout/[id]/opengraph-image and /b/[id]/opengraph-image.

import { ImageResponse } from 'next/og';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { bouts, type TranscriptEntry, type ArenaAgent } from '@/db/schema';
import { PRESETS, ARENA_PRESET_ID, DEFAULT_AGENT_COLOR } from '@/lib/presets';
import { getMostReactedTurnIndex, getReactionCounts } from '@/lib/reactions';

export const ogSize = { width: 1200, height: 630 };

export async function renderBoutOGImage(boutId: string): Promise<ImageResponse> {
  // Fetch bout data
  let bout: (typeof bouts.$inferSelect) | null = null;
  if (db) {
    const [result] = await db
      .select()
      .from(bouts)
      .where(eq(bouts.id, boutId))
      .limit(1);
    bout = result ?? null;
  }

  // Get preset and agents
  const presetId = bout?.presetId;
  const preset = presetId ? PRESETS.find((p) => p.id === presetId) : null;
  const transcript = (bout?.transcript ?? []) as TranscriptEntry[];
  const agentLineup = (bout?.agentLineup ?? []) as ArenaAgent[];

  // Determine agents to display
  const agents =
    presetId === ARENA_PRESET_ID && agentLineup.length > 0
      ? agentLineup.map((a) => ({
          name: a.name,
          color: a.color ?? DEFAULT_AGENT_COLOR,
        }))
      : preset?.agents.map((a) => ({
          name: a.name,
          color: a.color ?? DEFAULT_AGENT_COLOR,
        })) ?? [];

  // Stats: turn count and total reactions
  const turnCount = transcript.length;
  let totalReactions = 0;
  // Hero message: surface the most-reacted turn as the OG quote.
  // Fallback chain: most-reacted turn > shareLine > first qualifying transcript entry.
  let topTurn: Awaited<ReturnType<typeof getMostReactedTurnIndex>> = null;
  if (db && bout) {
    try {
      const [topResult, reactionMap] = await Promise.all([
        getMostReactedTurnIndex(boutId),
        getReactionCounts(boutId),
      ]);
      topTurn = topResult;
      totalReactions = Object.values(reactionMap).reduce(
        (sum, r) => sum + r.heart + r.fire,
        0,
      );
    } catch {
      // Non-fatal — fall through to other quote sources
    }
  }
  const heroEntry = topTurn
    ? transcript.find((t) => t.turn === topTurn!.turnIndex)
    : null;
  const shareLine = bout?.shareLine;
  const quoteEntry = !heroEntry && !shareLine
    ? transcript.find((t) => t.text && t.text.length > 20 && t.text.length < 200)
    : null;
  const displayQuote = heroEntry?.text ?? shareLine ?? quoteEntry?.text ?? null;
  const quoteAgent = heroEntry?.agentName ?? quoteEntry?.agentName ?? null;
  const reactionBadge = topTurn && heroEntry
    ? { heart: topTurn.heartCount, fire: topTurn.fireCount }
    : null;

  const presetName = preset?.name ?? 'Custom Battle';
  const topic = bout?.topic ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0b0b0b',
          backgroundImage:
            'radial-gradient(circle at top left, rgba(215, 255, 63, 0.15), transparent 45%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          padding: 60,
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              'linear-gradient(rgba(244, 244, 240, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(244, 244, 240, 0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Corner accents */}
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: 30,
            width: 40,
            height: 40,
            borderLeft: '2px solid #d7ff3f',
            borderTop: '2px solid #d7ff3f',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 30,
            right: 30,
            width: 40,
            height: 40,
            borderRight: '2px solid #d7ff3f',
            borderTop: '2px solid #d7ff3f',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            left: 30,
            width: 40,
            height: 40,
            borderLeft: '2px solid #d7ff3f',
            borderBottom: '2px solid #d7ff3f',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            right: 30,
            width: 40,
            height: 40,
            borderRight: '2px solid #d7ff3f',
            borderBottom: '2px solid #d7ff3f',
          }}
        />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: '#f4f4f0',
              display: 'flex',
            }}
          >
            THE PIT
          </div>
          <div
            style={{
              fontSize: 18,
              color: '#a3a3a3',
              display: 'flex',
            }}
          >
            thepit.cloud
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            gap: 20,
          }}
        >
          {/* Preset badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#0b0b0b',
                backgroundColor: '#d7ff3f',
                padding: '6px 16px',
                borderRadius: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
              }}
            >
              {presetName}
            </div>
            {turnCount > 0 && (
              <div
                style={{
                  fontSize: 16,
                  color: '#a3a3a3',
                  display: 'flex',
                }}
              >
                {turnCount} turn{turnCount !== 1 ? 's' : ''}
              </div>
            )}
            {totalReactions > 0 && (
              <div
                style={{
                  fontSize: 16,
                  color: '#a3a3a3',
                  display: 'flex',
                }}
              >
                {totalReactions} reaction{totalReactions !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Topic */}
          {topic && (
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: '#f4f4f0',
                lineHeight: 1.15,
                display: 'flex',
                maxWidth: '95%',
              }}
            >
              {topic.length > 80 ? topic.slice(0, 77) + '...' : topic}
            </div>
          )}

          {/* Agents */}
          {agents.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              {agents.slice(0, 5).map((agent, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: 'rgba(244, 244, 240, 0.08)',
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: `2px solid ${agent.color}`,
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: agent.color,
                      display: 'flex',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 20,
                      color: '#f4f4f0',
                      fontWeight: 500,
                      display: 'flex',
                    }}
                  >
                    {agent.name}
                  </span>
                </div>
              ))}
              {agents.length > 5 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 20px',
                    fontSize: 20,
                    color: '#a3a3a3',
                  }}
                >
                  +{agents.length - 5} more
                </div>
              )}
            </div>
          )}

          {/* Quote */}
          {displayQuote && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginTop: 8,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  color: '#a3a3a3',
                  fontStyle: 'italic',
                  lineHeight: 1.4,
                  display: 'flex',
                  maxWidth: '90%',
                }}
              >
                &ldquo;{displayQuote.slice(0, 150)}
                {displayQuote.length > 150 ? '...' : ''}&rdquo;
              </div>
              {(quoteAgent || reactionBadge) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  {quoteAgent && (
                    <div
                      style={{
                        fontSize: 18,
                        color: '#d7ff3f',
                        display: 'flex',
                      }}
                    >
                      — {quoteAgent}
                    </div>
                  )}
                  {reactionBadge && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        fontSize: 16,
                        color: '#a3a3a3',
                      }}
                    >
                      {reactionBadge.fire > 0 && (
                        <span style={{ display: 'flex' }}>
                          {'🔥'} {reactionBadge.fire}
                        </span>
                      )}
                      {reactionBadge.heart > 0 && (
                        <span style={{ display: 'flex' }}>
                          {'❤️'} {reactionBadge.heart}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              backgroundColor: '#d7ff3f',
              color: '#0b0b0b',
              padding: '12px 32px',
              borderRadius: 8,
              fontSize: 20,
              fontWeight: 600,
              display: 'flex',
            }}
          >
            Watch the Battle
          </div>
        </div>
      </div>
    ),
    {
      ...ogSize,
      // Cache OG images at CDN edge for 1 hour, revalidate in background.
      // Reduces repeated compute for popular bout share links.
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    },
  );
}
