// Contestant CRUD -- domain module for the contestants table (M1.3).
//
// Pure persistence layer. Validates via Zod at the boundary,
// persists via Drizzle. No HTTP awareness.

import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { contestants } from '@/db/schema';
import type { DbOrTx } from '@/db';
import { asContestantId } from '@/lib/domain-ids';
import type { RunId } from '@/lib/domain-ids';
import { addContestantSchema, type AddContestantBody } from '@/lib/api-schemas';
import type { Contestant } from './types';

/** Add a contestant to a run. Validates input, generates nanoid, persists. */
export async function addContestant(
  db: DbOrTx,
  runId: RunId,
  input: AddContestantBody,
): Promise<Contestant> {
  const validated = addContestantSchema.parse(input);
  const id = asContestantId(nanoid());

  const [contestant] = await db
    .insert(contestants)
    .values({
      id,
      runId,
      label: validated.label,
      model: validated.model,
      provider: validated.provider ?? null,
      systemPrompt: validated.systemPrompt ?? null,
      temperature: validated.temperature ?? null,
      maxTokens: validated.maxTokens ?? null,
      toolAccess: validated.toolAccess ?? null,
      contextBundle: validated.contextBundle ?? null,
    })
    .returning();

  return contestant!;
}

/** Retrieve all contestants for a run. */
export async function getContestantsForRun(
  db: DbOrTx,
  runId: RunId,
): Promise<Contestant[]> {
  return db
    .select()
    .from(contestants)
    .where(eq(contestants.runId, runId));
}
