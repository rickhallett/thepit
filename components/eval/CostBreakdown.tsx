// Per-contestant cost, token, and latency breakdown (M3.4).

import type { ContestantEconomics } from '@/lib/run/economics';

type CostBreakdownProps = {
  economics: ContestantEconomics;
};

/** Format microdollars as a dollar string. */
function formatCost(micro: number): string {
  return `$${(micro / 1_000_000).toFixed(4)}`;
}

/** Format milliseconds as seconds with one decimal. */
function formatLatency(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function CostBreakdown({ economics }: CostBreakdownProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs uppercase tracking-[0.3em] text-muted">
        Cost / Tokens
      </h4>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-foreground/50">Model</dt>
        <dd className="font-mono">{economics.model}</dd>

        <dt className="text-foreground/50">Input tokens</dt>
        <dd className="font-mono">{economics.inputTokens.toLocaleString()}</dd>

        <dt className="text-foreground/50">Output tokens</dt>
        <dd className="font-mono">{economics.outputTokens.toLocaleString()}</dd>

        <dt className="text-foreground/50">Cost</dt>
        <dd className="font-mono text-accent">{formatCost(economics.costMicro)}</dd>

        <dt className="text-foreground/50">Latency</dt>
        <dd className="font-mono">{formatLatency(economics.latencyMs)}</dd>

        {economics.scorePerDollar !== null && (
          <>
            <dt className="text-foreground/50">Score / dollar</dt>
            <dd className="font-mono">{economics.scorePerDollar.toFixed(2)}</dd>
          </>
        )}

        {economics.scorePerSecond !== null && (
          <>
            <dt className="text-foreground/50">Score / second</dt>
            <dd className="font-mono">{economics.scorePerSecond.toFixed(4)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
