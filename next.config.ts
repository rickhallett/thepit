import { createRequire } from 'node:module';
import type { NextConfig } from "next";

// Node 21.2+ provides import.meta.dirname natively. Avoid the
// fileURLToPath(import.meta.url) pattern because Next.js 16's config
// compiler mishandles import.meta.url, producing "exports is not
// defined in ES module scope".
const __dirname = import.meta.dirname;
const require = createRequire(import.meta.url);

// Content-Security-Policy directives.
// Server-side-only domains (api.resend.com, export.arxiv.org, anthropic.helicone.ai,
// api.stripe.com) are omitted since CSP only governs the browser.
//
// Clerk domains: In production with a pk_live_ key only *.clerk.com is needed.
// The *.clerk.accounts.dev domain is included for development/staging with pk_test_ keys.
// TODO(launch): Once pk_live_ key is deployed, remove *.clerk.accounts.dev for a tighter CSP.
const clerkDomains = 'https://*.clerk.accounts.dev https://*.clerk.com';
const clerkImgDomains = 'https://img.clerk.com https://images.clerk.dev https://images.clerk.com';
// PostHog uses both us.i.posthog.com (ingest) and us-assets.i.posthog.com (assets/config)
const posthogDomains = 'https://us.i.posthog.com https://us-assets.i.posthog.com';

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${clerkDomains} ${posthogDomains} https://cdn.jsdelivr.net`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: ${clerkImgDomains}`,
  "font-src 'self' data:",
  `connect-src 'self' ${clerkDomains} ${posthogDomains} https://*.ingest.us.sentry.io https://*.sentry.io https://vitals.vercel-insights.com https://checkout.stripe.com https://billing.stripe.com`,
  `frame-src 'self' https://checkout.stripe.com ${clerkDomains}`,
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
