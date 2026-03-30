// Evaluation persistence -- domain module for the evaluations table (M2.2).
//
// Pure persistence layer. No HTTP awareness, no AI calls.

import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { evaluations } from '@/db/schema';
import type { CriterionScore, ReconciliationEvent } from '@/db/schema';
import type { DbOrTx } from '@/db';
import { asEvaluationId } from '@/lib/domain-ids';
import type { RunId, ContestantId, RubricId } from '@/lib/domain-ids';
import type { Evaluation } from './types';

/** Input shape for inserting an evaluation record. */
export type InsertEvaluationInput = {
  runId: RunId;
  contestantId: ContestantId;
  rubricId: RubricId;
  judgeModel: string;
  scores: CriterionScore[];
  overallScore: number;
  rationale: string;
  rawJudgeResponse?: string | null;
  reconciliation?: ReconciliationEvent[] | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs?: number | null;
};

/** Persist a new evaluation record. Returns the created evaluation. */
export async function insertEvaluation(
  db: DbOrTx,
  input: InsertEvaluationInput,
): Promise<Evaluation> {
  const id = asEvaluationId(nanoid());

  const [evaluation] = await db
    .insert(evaluations)
    .values({
      id,
      runId: input.runId,
      contestantId: input.contestantId,
      rubricId: input.rubricId,
      judgeModel: input.judgeModel,
      scores: input.scores,
      overallScore: input.overallScore,
      rationale: input.rationale,
      rawJudgeResponse: input.rawJudgeResponse ?? null,
      reconciliation: input.reconciliation ?? null,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      latencyMs: input.latencyMs ?? null,
    })
    .returning();

  return evaluation!;
}

/** Get all evaluations for a run. */
export async function getEvaluationsForRun(
  db: DbOrTx,
  runId: RunId,
): Promise<Evaluation[]> {
  return db
    .select()
    .from(evaluations)
    .where(eq(evaluations.runId, runId))
    .orderBy(desc(evaluations.createdAt));
}

/** Get all evaluations for a contestant. */
export async function getEvaluationsForContestant(
  db: DbOrTx,
  contestantId: ContestantId,
): Promise<Evaluation[]> {
  return db
    .select()
    .from(evaluations)
    .where(eq(evaluations.contestantId, contestantId))
    .orderBy(desc(evaluations.createdAt));
}

/** Get the latest evaluation for a (contestantId, rubricId) pair. */
export async function getLatestEvaluation(
  db: DbOrTx,
  contestantId: ContestantId,
  rubricId: RubricId,
): Promise<Evaluation | null> {
  const [evaluation] = await db
    .select()
    .from(evaluations)
    .where(and(
      eq(evaluations.contestantId, contestantId),
      eq(evaluations.rubricId, rubricId),
    ))
    .orderBy(desc(evaluations.createdAt))
    .limit(1);

  return evaluation ?? null;
}
