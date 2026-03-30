// Judge engine -- LLM-as-judge evaluation for runs (M2.2).
//
// The only module in lib/eval/ that calls the AI SDK.
// Takes a rubric + trace and returns structured scores with rationale.

import { z } from 'zod/v4';
import { generateObject } from 'ai';
import { eq } from 'drizzle-orm';

import { nanoid } from 'nanoid';
import { runs, contestants, traces, tasks, costLedger } from '@/db/schema';
import type { DbOrTx } from '@/db';
import { getModel } from '@/lib/ai';
import type { RunId, RubricId, ContestantId, EvaluationId } from '@/lib/domain-ids';
import type { Rubric, Evaluation, RubricCriterion, FailureCategory } from './types';
import type { CriterionScore, ReconciliationEvent } from '@/db/schema';
import type { TraceMessage } from '@/db/schema';
import { getRubric } from './rubrics';
import { insertEvaluation } from './evaluations';
import { computeWeightedScore } from './scoring';
import { addFailureTag } from './failure-tags';
import { computeCostMicro } from '@/lib/run/pricing';

// ---------------------------------------------------------------------------
// Judge config
// ---------------------------------------------------------------------------

export type JudgeConfig = {
  model: string;
  rubricId: RubricId;
  temperature?: number;
};

// ---------------------------------------------------------------------------
// Judge output schema (Zod for generateObject)
// ---------------------------------------------------------------------------

const judgeOutputSchema = z.object({
  scores: z.array(z.object({
    criterionName: z.string(),
    score: z.number(),
    rationale: z.string().min(1),
  })),
  overallRationale: z.string().min(1),
  failureTags: z.array(z.object({
    category: z.enum([
      'wrong_answer',
      'partial_answer',
      'refusal',
      'off_topic',
      'unsafe_output',
      'hallucination',
      'format_violation',
      'context_misuse',
      'instruction_violation',
    ]),
    description: z.string(),
  })).optional(),
});

type JudgeOutput = z.infer<typeof judgeOutputSchema>;

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

/** Build the judge prompt messages for evaluating a contestant response. */
export function buildJudgePrompt(
  task: { prompt: string },
  rubric: Rubric,
  contestantResponse: string,
): TraceMessage[] {
  return [
    {
      role: 'system',
      content: `You are an evaluation judge. You score outputs against explicit rubrics.
You must provide a numeric score and text rationale for EVERY criterion.
You must be specific about what the output did well and what it missed.
Do not award high scores for fluency alone. Evaluate substance.`,
    },
    {
      role: 'user',
      content: `## Task
${task.prompt}

## Rubric
${rubric.criteria.map((c: RubricCriterion) =>
  `### ${c.name} (weight: ${c.weight}, scale: ${c.scale.min}-${c.scale.max})
${c.description}
${c.scale.labels ? Object.entries(c.scale.labels).map(([k, v]) => `  ${k}: ${v}`).join('\n') : ''}`
).join('\n\n')}

## Output to evaluate
${contestantResponse}

## Instructions
Score the output against each criterion. Return JSON:
{
  "scores": [
    { "criterionName": "...", "score": N, "rationale": "..." }
  ],
  "overallRationale": "..."
}`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

/**
 * Reconcile judge output against rubric criteria.
 * Returns normalized scores and reconciliation events.
 */
function reconcileJudgeOutput(
  judgeOutput: JudgeOutput,
  criteria: RubricCriterion[],
): { scores: CriterionScore[]; events: ReconciliationEvent[] } {
  const events: ReconciliationEvent[] = [];
  const reconciledScores: CriterionScore[] = [];

  // Build a map of judge scores by lowercase trimmed name
  const judgeScoreMap = new Map<string, JudgeOutput['scores'][number]>();
  for (const js of judgeOutput.scores) {
    judgeScoreMap.set(js.criterionName.trim().toLowerCase(), js);
  }

  // Process each rubric criterion
  for (const criterion of criteria) {
    const key = criterion.name.trim().toLowerCase();
    const judgeScore = judgeScoreMap.get(key);

    if (!judgeScore) {
      // Missing criterion: score = scale.min
      events.push({
        type: 'missing_criterion',
        criterionName: criterion.name,
        detail: `Judge did not score criterion "${criterion.name}". Defaulting to scale minimum (${criterion.scale.min}).`,
      });
      reconciledScores.push({
        criterionName: criterion.name,
        score: criterion.scale.min,
        rationale: 'Criterion not scored by judge. Defaulted to scale minimum.',
      });
      continue;
    }

    // Check for out-of-range score
    let score = judgeScore.score;
    if (score < criterion.scale.min || score > criterion.scale.max) {
      events.push({
        type: 'score_clamped',
        criterionName: criterion.name,
        detail: `Score ${score} clamped to [${criterion.scale.min}, ${criterion.scale.max}].`,
      });
      score = Math.min(Math.max(score, criterion.scale.min), criterion.scale.max);
    }

    reconciledScores.push({
      criterionName: criterion.name,
      score,
      rationale: judgeScore.rationale,
    });

    // Remove from map to track extras
    judgeScoreMap.delete(key);
  }

  // Extra criteria (not in rubric) are discarded but logged
  for (const [, extra] of judgeScoreMap) {
    events.push({
      type: 'extra_criterion',
      criterionName: extra.criterionName,
      detail: `Judge returned extra criterion "${extra.criterionName}". Discarded.`,
    });
  }

  return { scores: reconciledScores, events };
}

// ---------------------------------------------------------------------------
// Single contestant evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a single contestant's trace against a rubric.
 * Calls the AI SDK, reconciles output, persists evaluation.
 */
export async function evaluateContestant(
  db: DbOrTx,
  config: JudgeConfig,
  trace: { responseContent: string | null; contestantId: string; runId: string },
  task: { prompt: string },
  rubric: Rubric,
): Promise<Evaluation> {
  const contestantResponse = trace.responseContent ?? '';
  const messages = buildJudgePrompt(task, rubric, contestantResponse);

  const model = getModel(config.model);
  const start = performance.now();

  const result = await generateObject({
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    schema: judgeOutputSchema,
    temperature: config.temperature ?? 0,
  });

  const latencyMs = Math.round(performance.now() - start);
  const judgeOutput = result.object;

  // Reconcile judge output against rubric criteria
  const { scores, events } = reconcileJudgeOutput(judgeOutput, rubric.criteria);

  // Compute weighted overall score
  const overallScore = computeWeightedScore(scores, rubric.criteria);

  // Persist evaluation
  const evaluation = await insertEvaluation(db, {
    runId: trace.runId as RunId,
    contestantId: trace.contestantId as ContestantId,
    rubricId: config.rubricId,
    judgeModel: config.model,
    scores,
    overallScore,
    rationale: judgeOutput.overallRationale,
    rawJudgeResponse: JSON.stringify(result.object),
    reconciliation: events.length > 0 ? events : null,
    inputTokens: result.usage?.inputTokens ?? null,
    outputTokens: result.usage?.outputTokens ?? null,
    latencyMs,
  });

  // Persist judge-assigned failure tags (M2.4)
  if (judgeOutput.failureTags && judgeOutput.failureTags.length > 0) {
    for (const ft of judgeOutput.failureTags) {
      await addFailureTag(db, {
        runId: trace.runId as RunId,
        contestantId: trace.contestantId as ContestantId,
        category: ft.category as FailureCategory,
        description: ft.description,
        source: 'judge',
        evaluationId: evaluation.id as EvaluationId,
      });
    }
  }

  // Cost ledger entry for judge evaluation (M3.1)
  const cost = computeCostMicro(
    config.model,
    result.usage?.inputTokens ?? 0,
    result.usage?.outputTokens ?? 0,
  );
  if (cost) {
    await db.insert(costLedger).values({
      id: nanoid(),
      sourceType: 'evaluation',
      sourceId: evaluation.id,
      runId: trace.runId,
      contestantId: trace.contestantId,
      model: config.model,
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      ...cost,
      latencyMs,
    });
  }

  return evaluation;
}

// ---------------------------------------------------------------------------
// Full run evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate all contestants in a run against a rubric.
 * Sequential execution for deterministic ordering.
 *
 * Accepts runs in 'completed' or 'failed' status.
 * Skips contestants with error traces.
 * Rejects 'pending' and 'running' runs.
 */
export async function evaluateRun(
  db: DbOrTx,
  runId: RunId,
  config: JudgeConfig,
): Promise<Evaluation[]> {
  // 1. Load run
  const [run] = await db
    .select()
    .from(runs)
    .where(eq(runs.id, runId))
    .limit(1);

  if (!run) {
    throw new Error(`Run not found: ${runId}`);
  }

  if (run.status === 'pending' || run.status === 'running') {
    throw new Error(`Run ${runId} is ${run.status}, expected completed or failed`);
  }

  // 2. Load rubric
  const rubric = await getRubric(db, config.rubricId);
  if (!rubric) {
    throw new Error(`Rubric not found: ${config.rubricId}`);
  }

  // 3. Load task
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, run.taskId))
    .limit(1);

  if (!task) {
    throw new Error(`Task not found: ${run.taskId}`);
  }

  // 4. Load contestants and their traces
  const contestantRows = await db
    .select()
    .from(contestants)
    .where(eq(contestants.runId, runId));

  const traceRows = await db
    .select()
    .from(traces)
    .where(eq(traces.runId, runId));

  // 5. Evaluate each contestant sequentially
  const evaluationResults: Evaluation[] = [];

  for (const contestant of contestantRows) {
    const trace = traceRows.find((t) => t.contestantId === contestant.id);

    // Skip contestants with no trace or error traces
    if (!trace || trace.status === 'error') {
      continue;
    }

    const evaluation = await evaluateContestant(
      db,
      config,
      trace,
      task,
      rubric,
    );

    evaluationResults.push(evaluation);
  }

  return evaluationResults;
}
