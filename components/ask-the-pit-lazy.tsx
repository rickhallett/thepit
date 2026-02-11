'use client';

import dynamic from 'next/dynamic';

const AskThePit = dynamic(
  () => import('@/components/ask-the-pit').then((m) => ({ default: m.AskThePit })),
  { ssr: false },
);

export function AskThePitLazy({ enabled }: { enabled: boolean }) {
  return <AskThePit enabled={enabled} />;
}
