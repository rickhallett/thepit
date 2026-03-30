// Rubric CRUD -- domain module for the rubrics table (M2.1).
//
// Pure persistence layer. Validates via Zod at the boundary,
// persists via Drizzle. No HTTP awareness.

import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { rubrics } from '@/db/schema';
import type { DbOrTx } from '@/db';
import { asRubricId, type RubricId } from '@/lib/domain-ids';
import { createRubricSchema, type CreateRubricBody } from '@/lib/api-schemas';
import type { Rubric, ListRubricsOptions } from './types';

/** Create a new rubric. Validates input, generates nanoid, persists. */
export async function createRubric(
  db: DbOrTx,
  input: CreateRubricBody,
): Promise<Rubric> {
  const validated = createRubricSchema.parse(input);
  const id = asRubricId(nanoid());

  const [rubric] = await db
    .insert(rubrics)
    .values({
      id,
      name: validated.name,
      description: validated.description ?? null,
      domain: validated.domain ?? null,
      criteria: validated.criteria,
    })
    .returning();

  return rubric!;
}

/** Retrieve a single rubric by ID. Returns null if not found. */
export async function getRubric(
  db: DbOrTx,
  id: RubricId,
): Promise<Rubric | null> {
  const [rubric] = await db
    .select()
    .from(rubrics)
    .where(eq(rubrics.id, id))
    .limit(1);

  return rubric ?? null;
}

/** List rubrics with optional domain filter and pagination. */
export async function listRubrics(
  db: DbOrTx,
  opts: ListRubricsOptions = {},
): Promise<Rubric[]> {
  const { domain, limit = 50, offset = 0 } = opts;

  if (domain) {
    return db
      .select()
      .from(rubrics)
      .where(eq(rubrics.domain, domain))
      .orderBy(desc(rubrics.createdAt))
      .limit(limit)
      .offset(offset);
  }

  return db
    .select()
    .from(rubrics)
    .orderBy(desc(rubrics.createdAt))
    .limit(limit)
    .offset(offset);
}
