'use client';

import { useState, useRef } from 'react';
import { trackEvent } from '@/lib/analytics';
import type { ReactionCountMap } from '@/lib/reactions';

/**
 * Hook for managing bout reaction state and submission.
 * Handles optimistic updates and best-effort API calls.
 */
export function useBoutReactions(
  boutId: string,
  initialReactions?: ReactionCountMap,
) {
  const [reactions, setReactions] = useState<ReactionCountMap>(
    initialReactions ?? {},
  );
  const reactionsGivenRef = useRef(0);

  const sendReaction = async (turn: number, reactionType: 'heart' | 'fire') => {
    // Optimistic update
    setReactions((prev) => {
      const current = prev[turn] ?? { heart: 0, fire: 0 };
      return {
        ...prev,
        [turn]: {
          ...current,
          [reactionType]: (current[reactionType] ?? 0) + 1,
        },
      };
    });

    try {
      await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boutId, turnIndex: turn, reactionType }),
      });
      trackEvent('reaction_submitted', { reactionType, turn });
      reactionsGivenRef.current += 1;
    } catch {
      // swallow; reactions are best-effort
    }
  };

  return { reactions, sendReaction, reactionsGivenRef };
}
