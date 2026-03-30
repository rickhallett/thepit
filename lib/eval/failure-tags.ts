// Failure tag persistence -- domain module for the failure_tags table (M2.4).
//
// Pure persistence layer. No HTTP awareness, no AI calls.
// Tags can be assigned manually (via API) or by the judge engine.

import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { failureTags, failureCategory } from '@/db/schema';
import type { DbOrTx } from '@/db';
import { asFailureTagId } from '@/lib/domain-ids';
import type { RunId, ContestantId, EvaluationId } from '@/lib/domain-ids';
import type { FailureTag, FailureCategory } from './types';

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export type AddFailureTagInput = {
  runId: RunId;
  contestantId: ContestantId;
  category: FailureCategory;
  description?: string | null;
  source: 'manual' | 'judge';
  evaluationId?: EvaluationId | null;
};

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/** Persist a new failure tag. Returns the created tag. */
export async function addFailureTag(
  db: DbOrTx,
  input: AddFailureTagInput,
): Promise<FailureTag> {
  const id = asFailureTagId(nanoid());

  const [tag] = await db
    .insert(failureTags)
    .values({
      id,
      runId: input.runId,
      contestantId: input.contestantId,
      category: input.category,
      description: input.description ?? null,
      source: input.source,
      evaluationId: input.evaluationId ?? null,
    })
    .returning();

  return tag!;
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/** Get all failure tags for a run. */
export async function getFailureTagsForRun(
  db: DbOrTx,
  runId: RunId,
): Promise<FailureTag[]> {
  return db
    .select()
    .from(failureTags)
    .where(eq(failureTags.runId, runId));
}

/** Get all failure tags for a contestant. */
export async function getFailureTagsForContestant(
  db: DbOrTx,
  contestantId: ContestantId,
): Promise<FailureTag[]> {
  return db
    .select()
    .from(failureTags)
    .where(eq(failureTags.contestantId, contestantId));
}

/** Get failure distribution counts by category. */
export async function getFailureDistribution(
  db: DbOrTx,
  opts?: { runId?: RunId; domain?: string },
): Promise<Record<FailureCategory, number>> {
  // Initialize all categories to 0
  const distribution = Object.fromEntries(
    failureCategory.enumValues.map((c) => [c, 0]),
  ) as Record<FailureCategory, number>;

  const baseQuery = db
    .select({
      category: failureTags.category,
      count: sql<number>`count(*)::int`,
    })
    .from(failureTags);

  const rows = opts?.runId
    ? await baseQuery.where(eq(failureTags.runId, opts.runId)).groupBy(failureTags.category)
    : await baseQuery.groupBy(failureTags.category);

  for (const row of rows) {
    distribution[row.category] = row.count;
  }

  return distribution;
}
