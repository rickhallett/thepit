'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PitButton } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UpgradeTier = {
  tier: string;
  limit: number | null;
  url: string;
};

export type RateLimitInfo = {
  remaining: number;
  resetAt: number;
  limit?: number;
  currentTier?: string;
  upgradeTiers?: UpgradeTier[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DISMISS_KEY = 'pit:rate-limit-dismissed';

function isDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function dismissForSession(): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // Private browsing or quota exceeded — silently ignore.
  }
}

/** Human-readable tier labels. */
const TIER_LABELS: Record<string, string> = {
  anonymous: 'Anonymous',
  free: 'Free',
  pass: 'Pit Pass',
  lab: 'Pit Lab',
};

function tierLabel(tier: string): string {
  return TIER_LABELS[tier] ?? tier;
}

/** Format a limit number for display (null = unlimited). */
function formatLimit(limit: number | null): string {
  if (limit === null) return 'Unlimited';
  return `${limit}/hr`;
}

/** Format seconds remaining as "Xm Ys" or "Xs". */
function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'now';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// ---------------------------------------------------------------------------
// Hook: useCountdown
// ---------------------------------------------------------------------------

function useCountdown(resetAt: number): number {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((resetAt - Date.now()) / 1000)),
  );

  useEffect(() => {
    // Recalculate in case resetAt changed.
    setSecondsLeft(Math.max(0, Math.ceil((resetAt - Date.now()) / 1000)));

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [resetAt]);

  return secondsLeft;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RateLimitUpgradePrompt({
  rateLimit,
  errorMessage,
}: {
  rateLimit: RateLimitInfo;
  errorMessage?: string;
}) {
  const secondsLeft = useCountdown(rateLimit.resetAt);
  const [dismissed, setDismissed] = useState(isDismissedThisSession);

  const currentTier = rateLimit.currentTier ?? 'free';
  const upgradeTiers = rateLimit.upgradeTiers ?? [];
  const isAnonymous = currentTier === 'anonymous';
  const isTopTier = currentTier === 'lab' || upgradeTiers.length === 0;

  const handleDismiss = useCallback(() => {
    dismissForSession();
    setDismissed(true);
  }, []);

  // Tier benefit descriptions for the upgrade CTA.
  const tierBenefits: Record<string, string> = useMemo(
    () => ({
      pass: 'All presets + agent analytics',
      lab: 'API access + CLI tools + unlimited agents',
    }),
    [],
  );

  return (
    <div className="flex flex-col gap-5 border-2 border-red-400/60 bg-black/60 p-8">
      {/* Error message */}
      <p className="text-sm text-red-400">
        {errorMessage ?? 'You\u2019ve hit the rate limit.'}
      </p>

      {/* Countdown timer — always shown */}
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted">
        <span className="text-foreground/80">Resets in</span>
        <span className="font-mono text-sm text-foreground">
          {formatCountdown(secondsLeft)}
        </span>
      </div>

      {/* Anonymous users: sign-in prompt */}
      {isAnonymous && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted">
            Sign in for higher limits and more features.
          </p>
          <Link
            href="/sign-in?redirect_url=/arena"
            className="inline-flex w-fit rounded-full border-2 border-accent/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-accent transition hover:border-accent hover:bg-accent/10"
          >
            Sign in to continue
          </Link>
        </div>
      )}

      {/* Upgrade CTA — shown if not dismissed, not anonymous, and not top tier */}
      {!isAnonymous && !isTopTier && !dismissed && upgradeTiers.length > 0 && (
        <div className="flex flex-col gap-4 border-t border-foreground/20 pt-5">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">
            Want more?
          </p>

          <div className="flex flex-col gap-3">
            {upgradeTiers.map((upgrade) => (
              <Link
                key={upgrade.tier}
                href={upgrade.url}
                className="flex items-center justify-between rounded border-2 border-foreground/40 px-4 py-3 transition hover:border-accent hover:text-accent"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-[0.3em] text-foreground">
                    {tierLabel(upgrade.tier)}
                  </span>
                  <span className="text-[10px] tracking-[0.2em] text-muted">
                    {tierBenefits[upgrade.tier] ?? ''}
                  </span>
                </div>
                <span className="text-xs font-mono text-accent">
                  {formatLimit(upgrade.limit)}
                </span>
              </Link>
            ))}
          </div>

          <PitButton
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="self-end"
          >
            Remind me later
          </PitButton>
        </div>
      )}

      {/* Try again button */}
      <PitButton
        variant="secondary"
        size="lg"
        onClick={() => window.location.assign('/arena')}
        className="self-start"
      >
        Try again
      </PitButton>
    </div>
  );
}
