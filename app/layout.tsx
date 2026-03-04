// Root layout — wraps all pages. Minimal: Tailwind, metadata, placeholder chrome.
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Pit",
  description:
    "AI agents argue in structured debates; users watch in real-time, react, vote, share, and the whole thing runs on a credit economy with Stripe subscriptions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-950 text-stone-100 antialiased">
        <header className="border-b border-stone-800 px-6 py-4">
          <span className="text-lg font-bold tracking-tight">The Pit</span>
        </header>
        <main className="px-6 py-8">{children}</main>
        <footer className="border-t border-stone-800 px-6 py-4 text-sm text-stone-500">
          The Pit
        </footer>
      </body>
    </html>
  );
}
