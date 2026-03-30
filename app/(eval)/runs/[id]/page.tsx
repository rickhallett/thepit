// Run report page -- server component displaying run data, traces,
// evaluations, economics, and comparison (M3.4). Closes #127.

import { notFound } from 'next/navigation';
import { requireDb } from '@/db';
import { asRunId, asRubricId } from '@/lib/domain-ids';
import { getRunWithTraces } from '@/lib/run/queries';
import { getRunEconomics } from '@/lib/run/economics';
import { getEvaluationsForRun } from '@/lib/eval/evaluations';
import { assembleRunReport } from '@/lib/eval/report';
import { getFailureTagsForRun } from '@/lib/eval/failure-tags';

import { ScoreCard } from '@/components/eval/ScoreCard';
import { FailureTagBadge } from '@/components/eval/FailureTagBadge';
import { CostBreakdown } from '@/components/eval/CostBreakdown';
import { ComparisonView } from '@/components/eval/ComparisonView';
import { TraceViewer } from '@/components/eval/TraceViewer';
import { EvaluateButton } from '@/components/eval/EvaluateButton';

import type { RunReport } from '@/lib/eval/types';

export default async function RunReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = requireDb();
  const runId = asRunId(id);

  const run = await getRunWithTraces(db, runId);
  if (!run) notFound();

  const economics = await getRunEconomics(db, runId);

  // Check for evaluations and build report if any exist.
  // We need a rubricId to assemble the report. Find it from
  // the first evaluation, if evaluations exist.
  const allEvaluations = await getEvaluationsForRun(db, runId);
  const allFailureTags = await getFailureTagsForRun(db, runId);

  let report: RunReport | null = null;
  if (allEvaluations.length > 0) {
    const rubricId = asRubricId(allEvaluations[0]!.rubricId);
    report = await assembleRunReport(db, runId, rubricId);
  }

  const { task, contestants, status } = run;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-lg text-foreground">{task.name}</h1>
        <p className="mt-1 text-sm text-foreground/50">
          Run {id} / {status}
        </p>
      </div>

      {/* Task details */}
      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-[0.3em] text-muted">
          Task
        </h2>
        <div className="rounded border border-foreground/10 p-4 text-sm">
          <p className="text-foreground/70">{task.prompt}</p>

          {task.constraints && (task.constraints as string[]).length > 0 && (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Constraints
              </p>
              <ul className="ml-4 mt-1 list-disc text-foreground/50">
                {(task.constraints as string[]).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {task.acceptanceCriteria &&
            (task.acceptanceCriteria as string[]).length > 0 && (
              <div className="mt-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">
                  Acceptance Criteria
                </p>
                <ul className="ml-4 mt-1 list-disc text-foreground/50">
                  {(task.acceptanceCriteria as string[]).map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      </section>

      {/* Summary (from report) */}
      {report?.summary && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-[0.3em] text-muted">
            Summary
          </h2>
          <div className="rounded border border-foreground/10 p-4 text-sm text-foreground/70">
            {report.summary}
          </div>
        </section>
      )}

      {/* Comparison (if evaluated and 2+ contestants) */}
      {report?.comparison && (
        <section>
          <ComparisonView comparison={report.comparison} />
        </section>
      )}

      {/* Contestants */}
      <section className="space-y-6">
        <h2 className="text-xs uppercase tracking-[0.3em] text-muted">
          Contestants ({contestants.length})
        </h2>

        {contestants.map((c) => {
          const contestantFailureTags = allFailureTags.filter(
            (ft) => ft.contestantId === c.id,
          );
          const reportContestant = report?.contestants.find(
            (rc) => rc.contestant.id === c.id,
          );
          const contestantEconomics = economics?.contestants.find(
            (ce) => ce.contestantId === c.id,
          );

          return (
            <div
              key={c.id}
              className="space-y-4 rounded border border-foreground/10 p-4"
            >
              {/* Contestant header */}
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm text-foreground">{c.label}</h3>
                <span className="font-mono text-xs text-foreground/50">
                  {c.model}
                </span>
              </div>

              {/* Config summary */}
              <div className="flex gap-4 text-xs text-foreground/40">
                {c.temperature !== null && (
                  <span>temp={c.temperature}</span>
                )}
                {c.systemPrompt && (
                  <span>system prompt set</span>
                )}
              </div>

              {/* Trace */}
              {c.trace && (
                <TraceViewer
                  requestMessages={c.trace.requestMessages}
                  responseContent={c.trace.responseContent}
                />
              )}

              {/* Scorecard */}
              {reportContestant?.scorecard && (
                <ScoreCard scorecard={reportContestant.scorecard} />
              )}

              {/* Failure tags */}
              {contestantFailureTags.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">
                    Failure Tags
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {contestantFailureTags.map((ft) => (
                      <FailureTagBadge
                        key={ft.id}
                        category={ft.category}
                        description={ft.description}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Economics */}
              {contestantEconomics && (
                <CostBreakdown economics={contestantEconomics} />
              )}
            </div>
          );
        })}
      </section>

      {/* Economics summary */}
      {economics && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-[0.3em] text-muted">
            Economics Summary
          </h2>
          <div className="rounded border border-foreground/10 p-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              <dt className="text-foreground/50">Total cost</dt>
              <dd className="font-mono text-accent">
                ${(economics.totalCostMicro / 1_000_000).toFixed(4)}
              </dd>

              <dt className="text-foreground/50">Total tokens</dt>
              <dd className="font-mono">
                {economics.totalTokens.toLocaleString()}
              </dd>

              <dt className="text-foreground/50">Total latency</dt>
              <dd className="font-mono">
                {(economics.totalLatencyMs / 1000).toFixed(1)}s
              </dd>

              {economics.cheapestContestant && (
                <>
                  <dt className="text-foreground/50">Cheapest</dt>
                  <dd className="font-mono">{economics.cheapestContestant}</dd>
                </>
              )}

              {economics.fastestContestant && (
                <>
                  <dt className="text-foreground/50">Fastest</dt>
                  <dd className="font-mono">{economics.fastestContestant}</dd>
                </>
              )}

              {economics.bestValueContestant && (
                <>
                  <dt className="text-foreground/50">Best value</dt>
                  <dd className="font-mono">{economics.bestValueContestant}</dd>
                </>
              )}
            </dl>
          </div>
        </section>
      )}

      {/* Evaluate button (if not yet evaluated) */}
      {allEvaluations.length === 0 && status === 'completed' && (
        <section>
          <EvaluateButton runId={id} />
        </section>
      )}
    </div>
  );
}
