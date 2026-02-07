import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { ClerkProvider } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { initializeUserSession } from '@/lib/onboarding';

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
  const { userId } = await auth();
  const referralCode = cookies().get('pit_ref')?.value ?? null;

  if (userId) {
    await initializeUserSession({ userId, referralCode });
  }

  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-background text-foreground antialiased">
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
