import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { ClerkProvider } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { dark } from '@clerk/themes';

import { Analytics } from '@vercel/analytics/react';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { AskThePitLazy } from '@/components/ask-the-pit-lazy';
import { CookieConsent } from '@/components/cookie-consent';
import { PostHogProvider } from '@/components/posthog-provider';
import { initializeUserSession } from '@/lib/onboarding';
import { ASK_THE_PIT_ENABLED } from '@/lib/ask-the-pit-config';
import { SITE_DESCRIPTION } from '@/lib/brand';
import { getCopy } from '@/lib/copy';
import { CopyProvider } from '@/lib/copy-client';

import './globals.css';

export const metadata: Metadata = {
  title: 'THE PIT — AI Battle Arena',
  description: SITE_DESCRIPTION,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thepit.cloud'),
  openGraph: {
    title: 'THE PIT — AI Battle Arena',
    description: SITE_DESCRIPTION,
    siteName: 'THE PIT',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@ThePitArena',
    creator: '@ThePitArena',
    title: 'THE PIT — AI Battle Arena',
    description: SITE_DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [{ userId }, cookieStore, copy] = await Promise.all([auth(), cookies(), getCopy()]);
  const referralCode = cookieStore.get('pit_ref')?.value ?? null;

  if (userId) {
    // Parse first-touch UTM params from cookie for signup attribution.
    let utmSource: string | null = null;
    let utmMedium: string | null = null;
    let utmCampaign: string | null = null;
    try {
      const utmRaw = cookieStore.get('pit_utm')?.value;
      if (utmRaw) {
        const utm = JSON.parse(utmRaw);
        utmSource = utm.utm_source ?? null;
        utmMedium = utm.utm_medium ?? null;
        utmCampaign = utm.utm_campaign ?? null;
      }
    } catch {
      // Malformed cookie — ignore
    }
    await initializeUserSession({ userId, referralCode, utmSource, utmMedium, utmCampaign });
  }

  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/arena"
      signUpFallbackRedirectUrl="/arena"
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#7aa2f7',
          colorBackground: '#1a1b26',
          colorInputBackground: '#24283b',
          colorText: '#c0caf5',
          colorTextSecondary: '#565f89',
          fontFamily: '"IBM Plex Mono", monospace',
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body className="bg-background text-foreground antialiased">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border-2 focus:border-accent focus:bg-background focus:px-4 focus:py-2 focus:text-xs focus:uppercase focus:tracking-[0.3em] focus:text-accent"
          >
            {copy.nav.skipToContent}
          </a>
          <PostHogProvider>
            <CopyProvider copy={copy}>
              <div className="mx-auto flex min-h-screen max-w-[1920px] flex-col">
                <SiteHeader />
                <main id="main-content" className="flex-1">{children}</main>
                <SiteFooter />
                <AskThePitLazy enabled={ASK_THE_PIT_ENABLED} />
                <CookieConsent />
              </div>
              <Analytics />
            </CopyProvider>
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
