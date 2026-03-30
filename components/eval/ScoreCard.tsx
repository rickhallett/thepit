// Per-contestant scorecard display with criterion scores (M3.4).

import type { Scorecard } from '@/lib/eval/types';

type ScoreCardProps = {
  scorecard: Scorecard;
};

export function ScoreCard({ scorecard }: ScoreCardProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h4 className="text-xs uppercase tracking-[0.3em] text-muted">
          Scorecard
        </h4>
        <span className="font-mono text-sm text-accent">
          {(scorecard.overallScore * 100).toFixed(1)}%
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-foreground/10 text-left text-xs uppercase tracking-[0.2em] text-muted">
            <th className="py-1 pr-2">Criterion</th>
            <th className="py-1 pr-2 text-right">Score</th>
            <th className="py-1 pr-2 text-right">Weight</th>
            <th className="py-1">Rationale</th>
          </tr>
        </thead>
        <tbody>
          {scorecard.criterionScores.map((cs) => (
            <tr
              key={cs.name}
              className="border-b border-foreground/5"
            >
              <td className="py-1.5 pr-2 text-foreground/70">
                {cs.name}
              </td>
              <td className="py-1.5 pr-2 text-right font-mono">
                {(cs.normalizedScore * 100).toFixed(0)}%
              </td>
              <td className="py-1.5 pr-2 text-right font-mono text-foreground/50">
                {cs.weight}
              </td>
              <td className="py-1.5 text-foreground/50">
                {cs.rationale}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
