// Shared OG image renderer for bout replay pages.
// Used by both /bout/[id]/opengraph-image and /b/[id]/opengraph-image.

import { ImageResponse } from 'next/og';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { bouts, type TranscriptEntry, type ArenaAgent } from '@/db/schema';
import { PRESETS, ARENA_PRESET_ID, DEFAULT_AGENT_COLOR } from '@/lib/presets';

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

  // Get a quote from the bout
  const shareLine = bout?.shareLine;
  const quoteEntry = shareLine
    ? null
    : transcript.find((t) => t.text && t.text.length > 20 && t.text.length < 200);
  const displayQuote = shareLine ?? quoteEntry?.text ?? null;
  const quoteAgent = quoteEntry?.agentName;

  const presetName = preset?.name ?? 'Custom Battle';

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
            gap: 32,
          }}
        >
          {/* Preset name */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: '#f4f4f0',
              lineHeight: 1.1,
              display: 'flex',
            }}
          >
            {presetName}
          </div>

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
    { ...ogSize },
  );
}
