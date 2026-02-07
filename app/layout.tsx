import type { Metadata } from 'next';

import { ClerkProvider } from '@clerk/nextjs';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

import './globals.css';

export const metadata: Metadata = {
  title: 'THE PIT — AI Battle Arena',
  description: 'A high-velocity multi-agent debate arena.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
