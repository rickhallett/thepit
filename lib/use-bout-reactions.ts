'use client';

import { useState, useRef, useCallback } from 'react';
import { trackEvent } from '@/lib/analytics';
import type { ReactionCountMap } from '@/lib/reactions';

/** Set of reactions the current user has given, keyed by "turn:type". */
export type UserReactionSet = Set<string>;

const reactionKey = (turn: number, type: 'heart' | 'fire') => `${turn}:${type}`;

/**
 * Hook for managing bout reaction state and submission.
 * Supports toggle behavior: clicking a reaction adds it, clicking again removes it.
 * Each user gets at most one heart and one fire per turn.
 */
export function useBoutReactions(
  boutId: string,
  initialReactions?: ReactionCountMap,
  initialUserReactions?: string[],
) {
  const [reactions, setReactions] = useState<ReactionCountMap>(
    initialReactions ?? {},
  );
  const [userReactions, setUserReactions] = useState<UserReactionSet>(
    () => new Set(initialUserReactions ?? []),
  );
  const reactionsGivenRef = useRef(0);
  const pendingRef = useRef<Set<string>>(new Set());

  const hasReacted = useCallback(
    (turn: number, type: 'heart' | 'fire') => userReactions.has(reactionKey(turn, type)),
    [userReactions],
  );

  const sendReaction = useCallback(async (turn: number, reactionType: 'heart' | 'fire') => {
    const key = reactionKey(turn, reactionType);

    // Prevent double-clicks while API call is in flight
    if (pendingRef.current.has(key)) return;
    pendingRef.current.add(key);

    const isRemoving = userReactions.has(key);

    // Optimistic update
    setReactions((prev) => {
      const current = prev[turn] ?? { heart: 0, fire: 0 };
      const delta = isRemoving ? -1 : 1;
      return {
        ...prev,
        [turn]: {
          ...current,
          [reactionType]: Math.max(0, (current[reactionType] ?? 0) + delta),
        },
      };
    });

    setUserReactions((prev) => {
      const next = new Set(prev);
      if (isRemoving) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boutId, turnIndex: turn, reactionType }),
      });

      if (!res.ok) {
        // Non-OK response (rate limited, bad request, etc.) — revert optimistic update
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();

      // Server returns absolute counts — set them directly instead of
      // delta arithmetic. This eliminates all optimistic update drift.
      if (data.counts && data.turnIndex !== undefined) {
        setReactions((prev) => ({
          ...prev,
          [data.turnIndex]: {
            heart: data.counts.heart ?? 0,
            fire: data.counts.fire ?? 0,
          },
        }));
      }

      // Reconcile userReactions with server's actual action
      if (data.action === 'added') {
        setUserReactions((prev) => new Set(prev).add(key));
      } else if (data.action === 'removed') {
        setUserReactions((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }

      trackEvent('reaction_submitted', { bout_id: boutId, reaction_type: reactionType, turn, action: isRemoving ? 'removed' : 'added' });
      if (!isRemoving) reactionsGivenRef.current += 1;
    } catch {
      // Revert optimistic update on error
      setReactions((prev) => {
        const current = prev[turn] ?? { heart: 0, fire: 0 };
        const revert = isRemoving ? 1 : -1;
        return {
          ...prev,
          [turn]: {
            ...current,
            [reactionType]: Math.max(0, (current[reactionType] ?? 0) + revert),
          },
        };
      });
      setUserReactions((prev) => {
        const next = new Set(prev);
        if (isRemoving) {
          next.add(key);
        } else {
          next.delete(key);
        }
        return next;
      });
    } finally {
      pendingRef.current.delete(key);
    }
  }, [boutId, userReactions]);

  return { reactions, sendReaction, reactionsGivenRef, hasReacted };
}
