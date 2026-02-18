import { createRequire } from 'node:module';
import type { NextConfig } from "next";

// Node 21.2+ provides import.meta.dirname natively. Avoid the
// fileURLToPath(import.meta.url) pattern because Next.js 16's config
// compiler mishandles import.meta.url, producing "exports is not
// defined in ES module scope".
const __dirname = import.meta.dirname;
const require = createRequire(import.meta.url);

// Content-Security-Policy directives.
// Server-side-only domains (api.resend.com, export.arxiv.org,
// api.stripe.com) are omitted since CSP only governs the browser.
//
// Clerk domains: production uses clerk.thepit.cloud (Frontend API) and
// accounts.thepit.cloud (account portal). The *.clerk.accounts.dev and
// *.clerk.com domains are kept for development/staging with pk_test_ keys.
const clerkDomains = 'https://clerk.thepit.cloud https://accounts.thepit.cloud https://*.clerk.accounts.dev https://*.clerk.com';
const clerkImgDomains = 'https://img.clerk.com https://images.clerk.dev https://images.clerk.com';
// Clerk uses Cloudflare Turnstile for bot protection on sign-up/sign-in.
// The widget loads scripts and iframes from challenges.cloudflare.com.
const turnstileDomains = 'https://challenges.cloudflare.com';
// PostHog uses both us.i.posthog.com (ingest) and us-assets.i.posthog.com (assets/config).
// Kept in CSP even with the /ingest reverse proxy as a safety net — the PostHog SDK may
// bypass the proxy for session recording assets or feature flag evaluation.
const posthogDomains = 'https://us.i.posthog.com https://us-assets.i.posthog.com';

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${clerkDomains} ${turnstileDomains} ${posthogDomains} https://cdn.jsdelivr.net`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: ${clerkImgDomains}`,
  "font-src 'self' data:",
  `connect-src 'self' ${clerkDomains} ${turnstileDomains} ${posthogDomains} https://*.ingest.us.sentry.io https://*.sentry.io https://vitals.vercel-insights.com https://checkout.stripe.com https://billing.stripe.com`,
  `frame-src 'self' https://checkout.stripe.com ${clerkDomains} ${turnstileDomains}`,
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

  // PostHog reverse proxy (OCE-281) — route analytics through our own domain
  // to avoid ad-blocker interference. Client-side PostHog points api_host at
  // /ingest; these rewrites forward requests to the PostHog US ingest cluster.
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },

  // Required for PostHog reverse proxy — the SDK uses trailing slashes on
  // endpoints (/e/, /decide/). Without this, Next.js 308-redirects them,
  // and sendBeacon (used by capture_pageleave) does not follow redirects.
  skipTrailingSlashRedirect: true,
};

// Sentry wraps the Next.js config to enable source map uploads and
// automatic instrumentation. Use createRequire to load the CJS package
// — @sentry/nextjs resolves to CJS under the "node" condition but
// Next.js 16 compiles next.config.ts as ESM, so a static import causes
// "exports is not defined in ES module scope".
const { withSentryConfig } = require('@sentry/nextjs');

export default withSentryConfig(nextConfig, {
  // Upload source maps for readable stack traces in Sentry.
  // Requires SENTRY_AUTH_TOKEN and SENTRY_ORG/SENTRY_PROJECT env vars.
  silent: !process.env.CI,

  // Treeshake Sentry debug logging from production bundles.
  // Note: only effective with webpack builds; Turbopack ignores this.
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },

  // Opt out of Sentry's telemetry collection.
  telemetry: false,
});
