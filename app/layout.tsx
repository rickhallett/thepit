import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { ClerkProvider } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';

import { Analytics } from '@vercel/analytics/react';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { AskThePitLazy } from '@/components/ask-the-pit-lazy';
import { PostHogProvider } from '@/components/posthog-provider';
import { initializeUserSession } from '@/lib/onboarding';
import { ASK_THE_PIT_ENABLED } from '@/lib/ask-the-pit-config';

import './globals.css';

export const metadata: Metadata = {
  title: 'THE PIT — AI Battle Arena',
  description: 'A high-velocity multi-agent debate arena.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [{ userId }, cookieStore] = await Promise.all([auth(), cookies()]);
  const referralCode = cookieStore.get('pit_ref')?.value ?? null;

  if (userId) {
    await initializeUserSession({ userId, referralCode });
  }

  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-background text-foreground antialiased">
          <PostHogProvider>
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <div className="flex-1">{children}</div>
              <SiteFooter />
              <AskThePitLazy enabled={ASK_THE_PIT_ENABLED} />
            </div>
            <Analytics />
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
