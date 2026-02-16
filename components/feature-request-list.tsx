'use client';

import { useCallback, useEffect, useState } from 'react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

import { trackEvent } from '@/lib/analytics';
import { useCopy } from '@/lib/copy-client';

type FeatureRequest = {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
  displayName: string;
  voteCount: number;
  userVoted: boolean;
};

const getStatusLabels = (c: ReturnType<typeof useCopy>): Record<string, string> => ({
  planned: c.featureRequest.list.statusLabels.planned,
  shipped: c.featureRequest.list.statusLabels.shipped,
  reviewed: c.featureRequest.list.statusLabels.reviewed,
});

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function FeatureRequestList() {
  const c = useCopy();
  const STATUS_LABELS = getStatusLabels(c);
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/feature-requests');
      if (res.ok) {
        const json = await res.json();
        setRequests(json.requests);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleVote = async (requestId: number) => {
    // Optimistic update
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              userVoted: !r.userVoted,
              voteCount: r.userVoted ? r.voteCount - 1 : r.voteCount + 1,
            }
          : r,
      ),
    );

    try {
      const res = await fetch('/api/feature-requests/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureRequestId: requestId }),
      });

      if (res.ok) {
        const json = await res.json();
        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? { ...r, userVoted: json.voted, voteCount: json.voteCount }
              : r,
          ),
        );
        trackEvent('feature_request_voted');
      } else {
        // Revert optimistic update
        fetchRequests();
      }
    } catch {
      fetchRequests();
    }
  };

  if (loading) {
    return (
      <p className="text-xs uppercase tracking-[0.3em] text-muted">
        {c.featureRequest.list.loading}
      </p>
    );
  }

  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted">
        {c.featureRequest.list.empty}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {requests.map((r) => (
        <div
          key={r.id}
          className="border-2 border-foreground/40 bg-black/40 p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {r.title}
                </h3>
                <span className="rounded bg-foreground/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-muted">
                  {c.featureRequest.form.categories[r.category] ?? r.category}
                </span>
                {STATUS_LABELS[r.status] && (
                  <span className="rounded bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-accent">
                    {STATUS_LABELS[r.status]}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted line-clamp-3">
                {r.description}
              </p>
              <p className="mt-2 text-[10px] text-muted/60">
                {r.displayName} &middot; {timeAgo(r.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1">
              <SignedIn>
                <button
                  type="button"
                  onClick={() => handleVote(r.id)}
                  className={`flex h-10 w-10 items-center justify-center rounded border-2 transition ${
                    r.userVoted
                      ? 'border-accent bg-accent/20 text-accent'
                      : 'border-foreground/40 text-muted hover:border-accent hover:text-accent'
                  }`}
                  aria-label={r.userVoted ? 'Remove vote' : 'Vote'}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-4 w-4"
                  >
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded border-2 border-foreground/40 text-muted transition hover:border-accent hover:text-accent"
                    aria-label="Sign in to vote"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      className="h-4 w-4"
                    >
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  </button>
                </SignInButton>
              </SignedOut>
              <span className="text-xs font-bold text-foreground">
                {r.voteCount}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
