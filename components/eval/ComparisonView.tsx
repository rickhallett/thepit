// Side-by-side contestant comparison display (M3.4).

import type { RunComparison } from '@/lib/eval/types';

type ComparisonViewProps = {
  comparison: RunComparison;
};

export function ComparisonView({ comparison }: ComparisonViewProps) {
  const { contestants, winner, criterionBreakdown } = comparison;

  return (
    <div className="space-y-4">
      <h3 className="text-xs uppercase tracking-[0.3em] text-muted">
        Comparison
      </h3>

      {/* Winner declaration */}
      {winner && (
        <div className="rounded border border-accent/30 bg-accent/5 p-3">
          <p className="text-sm">
            <span className="text-accent">{winner.label}</span>{' '}
            wins by{' '}
            <span className="font-mono text-accent">
              {(winner.margin * 100).toFixed(1)}%
            </span>{' '}
            margin
          </p>
        </div>
      )}

      {/* Side-by-side overall scores */}
      <div className="grid grid-cols-2 gap-4">
        {contestants.map((sc) => (
          <div
            key={sc.contestantId}
            className={`rounded border p-3 ${
              winner?.contestantId === sc.contestantId
                ? 'border-accent/30'
                : 'border-foreground/10'
            }`}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              {sc.contestantLabel}
            </p>
            <p className="mt-1 font-mono text-lg text-accent">
              {(sc.overallScore * 100).toFixed(1)}%
            </p>
          </div>
        ))}
      </div>

      {/* Per-criterion breakdown */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-foreground/10 text-left text-xs uppercase tracking-[0.2em] text-muted">
            <th className="py-1 pr-2">Criterion</th>
            {contestants.map((sc) => (
              <th key={sc.contestantId} className="py-1 pr-2 text-right">
                {sc.contestantLabel}
              </th>
            ))}
            <th className="py-1 text-right">Winner</th>
          </tr>
        </thead>
        <tbody>
          {criterionBreakdown.map((cb) => (
            <tr
              key={cb.criterionName}
              className="border-b border-foreground/5"
            >
              <td className="py-1.5 pr-2 text-foreground/70">
                {cb.criterionName}
              </td>
              {cb.scores.map((s) => (
                <td
                  key={s.contestantLabel}
                  className={`py-1.5 pr-2 text-right font-mono ${
                    cb.winner === s.contestantLabel
                      ? 'text-accent'
                      : 'text-foreground/50'
                  }`}
                >
                  {(s.score * 100).toFixed(0)}%
                </td>
              ))}
              <td className="py-1.5 text-right text-foreground/50">
                {cb.winner ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
