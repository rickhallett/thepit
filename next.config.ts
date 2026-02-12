import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Content-Security-Policy directives.
// Server-side-only domains (api.resend.com, export.arxiv.org, anthropic.helicone.ai,
// api.stripe.com) are omitted since CSP only governs the browser.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://img.clerk.com https://images.clerk.dev",
  "font-src 'self' data:",
  "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://us.i.posthog.com https://*.ingest.us.sentry.io https://*.sentry.io https://vitals.vercel-insights.com https://checkout.stripe.com https://billing.stripe.com",
  "frame-src 'self' https://checkout.stripe.com https://*.clerk.accounts.dev https://*.clerk.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspDirectives.join('; '),
  },
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
  // Pin Turbopack root to this project directory to prevent it from
  // walking up to a parent lockfile (e.g. ~/code/bun.lock).
  turbopack: {
    root: __dirname,
  },
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

  // Treeshake Sentry debug logging from production bundles.
  // Note: only effective with webpack builds; Turbopack ignores this.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },

  // Opt out of Sentry's telemetry collection.
  telemetry: false,
});
