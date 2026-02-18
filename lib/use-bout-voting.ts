'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import type { WinnerVoteCounts } from '@/lib/winner-votes';

/**
 * Hook for managing winner vote state and submission.
 * Handles optimistic updates, error states, and pending UI.
 */
export function useBoutVoting(
  boutId: string,
  initialWinnerVotes?: WinnerVoteCounts,
  initialUserVote?: string | null,
) {
  const [winnerVotes, setWinnerVotes] = useState<WinnerVoteCounts>(
    initialWinnerVotes ?? {},
  );
  const [userVote, setUserVote] = useState<string | null>(
    initialUserVote ?? null,
  );
  const [voteError, setVoteError] = useState<string | null>(null);
  const [votePending, setVotePending] = useState<string | null>(null);

  const castWinnerVote = async (agentId: string) => {
    if (userVote || votePending) return;
    setVoteError(null);
    setVotePending(agentId);
    try {
      const res = await fetch('/api/winner-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boutId, agentId }),
      });
      if (res.status === 401) {
        setVoteError('Sign in to cast a winner vote.');
        return;
      }
      if (!res.ok) {
        setVoteError('Vote failed. Try again.');
        return;
      }
      setUserVote(agentId);
      setWinnerVotes((prev) => ({
        ...prev,
        [agentId]: (prev[agentId] ?? 0) + 1,
      }));
      trackEvent('winner_voted', { bout_id: boutId, agent_id: agentId });
    } finally {
      setVotePending(null);
    }
  };

  return { winnerVotes, userVote, voteError, votePending, castWinnerVote };
}
