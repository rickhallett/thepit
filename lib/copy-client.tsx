/**
 * Client-side copy resolution for A/B testing.
 *
 * Provides a React context and hook for accessing copy data in client
 * components. The copy object is passed from the server via CopyProvider
 * in the root layout.
 *
 * Usage:
 *   // In a client component:
 *   import { useCopy } from '@/lib/copy';
 *   const c = useCopy();
 *   <button>{c.hero.ctaPrimary}</button>
 */

'use client';

import { createContext, useContext } from 'react';
import type { CopySchema } from '@/copy/schema';

// The context is initialized with null — components must be wrapped in
// CopyProvider or they'll get null and the hook will throw.
const CopyContext = createContext<CopySchema | null>(null);

/**
 * Provider that passes the server-resolved copy data to client components.
 *
 * Placed in the root layout so all client components can access copy via
 * useCopy(). The variant is resolved server-side — the client never does
 * variant selection.
 */
export function CopyProvider({
  copy,
  children,
}: {
  copy: CopySchema;
  children: React.ReactNode;
}) {
  return <CopyContext.Provider value={copy}>{children}</CopyContext.Provider>;
}

/**
 * Access the copy object in a client component.
 *
 * @throws Error if used outside of CopyProvider.
 */
export function useCopy(): CopySchema {
  const copy = useContext(CopyContext);
  if (!copy) {
    throw new Error(
      'useCopy() must be used inside <CopyProvider>. ' +
      'Ensure app/layout.tsx wraps children with CopyProvider.',
    );
  }
  return copy;
}
