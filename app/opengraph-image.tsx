import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'THE PIT — Trust Infrastructure for AI Agents';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0b0b0b',
          backgroundImage:
            'radial-gradient(circle at top left, rgba(215, 255, 63, 0.15), transparent 45%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
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
            top: 40,
            left: 40,
            width: 60,
            height: 60,
            borderLeft: '3px solid #d7ff3f',
            borderTop: '3px solid #d7ff3f',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 40,
            width: 60,
            height: 60,
            borderRight: '3px solid #d7ff3f',
            borderTop: '3px solid #d7ff3f',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 40,
            width: 60,
            height: 60,
            borderLeft: '3px solid #d7ff3f',
            borderBottom: '3px solid #d7ff3f',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 40,
            width: 60,
            height: 60,
            borderRight: '3px solid #d7ff3f',
            borderBottom: '3px solid #d7ff3f',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              color: '#f4f4f0',
              letterSpacing: '-0.02em',
              display: 'flex',
            }}
          >
            THE PIT
          </div>

          {/* Accent line */}
          <div
            style={{
              width: 120,
              height: 4,
              backgroundColor: '#d7ff3f',
              borderRadius: 2,
            }}
          />

          {/* Tagline */}
          <div
            style={{
              fontSize: 32,
              color: '#d7ff3f',
              fontWeight: 500,
              display: 'flex',
            }}
          >
            Trust Infrastructure for AI Agents
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: 24,
              color: '#a3a3a3',
              marginTop: 16,
              display: 'flex',
            }}
          >
            Adversarial debate. Cryptographic identity. Crowd-verified trust.
          </div>
        </div>

        {/* Bottom badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#a3a3a3',
            fontSize: 18,
          }}
        >
          <span style={{ display: 'flex' }}>thepit.cloud</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
