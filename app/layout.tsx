import type { Metadata } from 'next';

import { ClerkProvider } from '@clerk/nextjs';

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
        <body className="antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
