import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

// Sentry wraps the Next.js config to enable source map uploads and
// automatic instrumentation. When SENTRY_AUTH_TOKEN is not set (local dev),
// this is effectively a no-op passthrough.
export default withSentryConfig(nextConfig, {
  // Upload source maps for readable stack traces in Sentry.
  // Requires SENTRY_AUTH_TOKEN and SENTRY_ORG/SENTRY_PROJECT env vars.
  silent: !process.env.CI,
  disableLogger: true,

  // Opt out of Sentry's telemetry collection.
  telemetry: false,
});
