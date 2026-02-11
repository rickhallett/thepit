// Credit economy for THE PIT.
//
// Three-layer unit system:
//   tokens (Anthropic API) -> GBP (cost) -> micro-credits (internal) -> credits (user-facing)
//
// 1 credit  = 100 micro-credits
// 1 credit  = CREDIT_VALUE_GBP (default 0.01 GBP)
// Token cost is computed from per-million pricing, converted to GBP, then to micro-credits.
//
// Micro-credits exist to avoid floating-point rounding in financial operations.
// All database storage and atomic operations use micro-credits as the base unit.
//
// Revenue comes from a configurable platform margin (default 10%) applied on top
// of Anthropic's API cost. BYOK users pay a flat per-1K-token platform fee instead.

import { desc, eq, sql } from 'drizzle-orm';

import { requireDb } from '@/db';
import { creditTransactions, credits } from '@/db/schema';

export const CREDIT_VALUE_GBP = Number(
  process.env.CREDIT_VALUE_GBP ?? '0.01',
);
export const MICRO_PER_CREDIT = 100;
export const MICRO_VALUE_GBP = CREDIT_VALUE_GBP / MICRO_PER_CREDIT;
export const CREDITS_ENABLED = process.env.CREDITS_ENABLED === 'true';
export const CREDITS_ADMIN_ENABLED =
  process.env.CREDITS_ADMIN_ENABLED === 'true';
export const CREDITS_ADMIN_GRANT = Number(
  process.env.CREDITS_ADMIN_GRANT ?? '100',
);
export const CREDIT_PLATFORM_MARGIN = Number(
  process.env.CREDIT_PLATFORM_MARGIN ?? '0.10',
);
export const TOKEN_CHARS_PER = Number(
  process.env.CREDIT_TOKEN_CHARS_PER ?? '4',
);
export const OUTPUT_TOKENS_PER_TURN = Number(
  process.env.CREDIT_OUTPUT_TOKENS_PER_TURN ?? '120',
);
export const INPUT_FACTOR = Number(
  process.env.CREDIT_INPUT_FACTOR ?? '5.5',
);

export const BYOK_ENABLED = process.env.BYOK_ENABLED === 'true';
export const BYOK_FEE_GBP_PER_1K_TOKENS = Number(
  process.env.BYOK_FEE_GBP_PER_1K_TOKENS ?? '0.0002',
);
export const BYOK_MIN_GBP = Number(process.env.BYOK_MIN_GBP ?? '0.001');

// Prices per million tokens in GBP (converted from USD at ~0.732 GBP/USD).
// Combined with CREDIT_PLATFORM_MARGIN (default 10%), these yield ~10% margin
// over actual Anthropic API costs.
const DEFAULT_MODEL_PRICES_GBP: Record<string, { in: number; out: number }> = {
  'claude-haiku-4-5-20251001': { in: 0.732, out: 3.66 },
  'claude-sonnet-4-5-20250929': { in: 2.196, out: 10.98 },
  'claude-opus-4-5-20251101': { in: 3.66, out: 18.3 },
  'claude-opus-4-6': { in: 3.66, out: 18.3 },
};

const ENV_MODEL_PRICES = (() => {
  const raw = process.env.MODEL_PRICES_GBP_JSON;
  if (!raw) return {} as Record<string, { in: number; out: number }>;
  try {
    return JSON.parse(raw) as Record<string, { in: number; out: number }>;
  } catch {
    return {} as Record<string, { in: number; out: number }>;
  }
})();

const MODEL_PRICES_GBP = {
  ...DEFAULT_MODEL_PRICES_GBP,
  ...ENV_MODEL_PRICES,
};

export const toMicroCredits = (gbpAmount: number) =>
  Math.ceil(gbpAmount / MICRO_VALUE_GBP);

export const microToCredits = (micro: number) => micro / MICRO_PER_CREDIT;

export const formatCredits = (micro: number) =>
  (micro / MICRO_PER_CREDIT).toFixed(2);

export const estimateTokensFromText = (text: string, min = 0) =>
  Math.max(min, Math.ceil(text.length / TOKEN_CHARS_PER));

export const getModelPricing = (modelId: string) => {
  return MODEL_PRICES_GBP[modelId];
};

export const estimateBoutTokens = (
  turns: number,
  outputTokensPerTurn = OUTPUT_TOKENS_PER_TURN,
) => {
  const outputTokens = Math.max(
    1,
    Math.ceil(turns * outputTokensPerTurn),
  );
  const inputTokens = Math.max(1, Math.ceil(outputTokens * INPUT_FACTOR));
  return { inputTokens, outputTokens };
};

export const estimateBoutCostGbp = (
  turns: number,
  modelId: string,
  outputTokensPerTurn = OUTPUT_TOKENS_PER_TURN,
) => {
  if (modelId === 'byok') {
    const { inputTokens, outputTokens } = estimateBoutTokens(
      turns,
      outputTokensPerTurn,
    );
    const totalTokens = inputTokens + outputTokens;
    const cost = (totalTokens / 1000) * BYOK_FEE_GBP_PER_1K_TOKENS;
    return Math.max(cost, BYOK_MIN_GBP);
  }
  const pricing = getModelPricing(modelId);
  if (!pricing) return 0;
  const { inputTokens, outputTokens } = estimateBoutTokens(
    turns,
    outputTokensPerTurn,
  );
  const raw =
    (inputTokens * pricing.in + outputTokens * pricing.out) / 1_000_000;
  return raw * (1 + CREDIT_PLATFORM_MARGIN);
};

export const computeCostGbp = (
  inputTokens: number,
  outputTokens: number,
  modelId: string,
) => {
  if (modelId === 'byok') {
    const totalTokens = inputTokens + outputTokens;
    const cost = (totalTokens / 1000) * BYOK_FEE_GBP_PER_1K_TOKENS;
    return Math.max(cost, BYOK_MIN_GBP);
  }
  const pricing = getModelPricing(modelId);
  if (!pricing) return 0;
  const raw =
    (inputTokens * pricing.in + outputTokens * pricing.out) / 1_000_000;
  return raw * (1 + CREDIT_PLATFORM_MARGIN);
};

export async function ensureCreditAccount(userId: string) {
  const db = requireDb();
  const [existing] = await db
    .select()
    .from(credits)
    .where(eq(credits.userId, userId))
    .limit(1);

  if (existing) return existing;

  const startingCredits = Number(process.env.CREDITS_STARTING_CREDITS ?? '500');
  const balanceMicro = Math.max(
    0,
    Math.round(startingCredits * MICRO_PER_CREDIT),
  );

  // Use onConflictDoNothing to handle concurrent insert races — two
  // simultaneous requests for the same new user won't throw a PK violation.
  const [created] = await db
    .insert(credits)
    .values({
      userId,
      balanceMicro,
    })
    .onConflictDoNothing()
    .returning();

  if (!created) {
    // Another request inserted first — re-read the row.
    const [raced] = await db
      .select()
      .from(credits)
      .where(eq(credits.userId, userId))
      .limit(1);
    if (!raced) throw new Error(`Failed to ensure credit account for ${userId}`);
    return raced;
  }

  return created;
}

export async function getCreditBalanceMicro(userId: string) {
  if (!CREDITS_ENABLED) return null;
  const account = await ensureCreditAccount(userId);
  return account.balanceMicro;
}

export async function applyCreditDelta(
  userId: string,
  deltaMicro: number,
  reason: string,
  metadata: Record<string, unknown>,
) {
  const db = requireDb();
  await db.insert(creditTransactions).values({
    userId,
    deltaMicro,
    source: reason,
    referenceId:
      typeof metadata.referenceId === 'string' ? metadata.referenceId : null,
    metadata,
  });

  const [updated] = await db
    .update(credits)
    .set({
      balanceMicro: sql`${credits.balanceMicro} + ${deltaMicro}`,
      updatedAt: new Date(),
    })
    .where(eq(credits.userId, userId))
    .returning();

  return updated;
}

export async function getCreditTransactions(userId: string, limit = 20) {
  const db = requireDb();
  return db
    .select({
      deltaMicro: creditTransactions.deltaMicro,
      source: creditTransactions.source,
      referenceId: creditTransactions.referenceId,
      metadata: creditTransactions.metadata,
      createdAt: creditTransactions.createdAt,
    })
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}

/**
 * Atomically preauthorize credits. This uses a conditional UPDATE that only
 * succeeds if the user has sufficient balance, preventing race conditions
 * where concurrent requests could overdraw the account.
 *
 * @returns Object with `success` boolean and current `balanceMicro`.
 *          If success is false, the preauth was rejected due to insufficient funds.
 */
export async function preauthorizeCredits(
  userId: string,
  amountMicro: number,
  reason: string,
  metadata: Record<string, unknown>,
): Promise<{ success: boolean; balanceMicro: number }> {
  const db = requireDb();

  // Ensure account exists first
  await ensureCreditAccount(userId);

  // Atomic conditional update: only deduct if balance >= amount
  // This prevents race conditions by making check-and-deduct a single operation
  const [result] = await db
    .update(credits)
    .set({
      balanceMicro: sql`${credits.balanceMicro} - ${amountMicro}`,
      updatedAt: new Date(),
    })
    .where(
      sql`${credits.userId} = ${userId} AND ${credits.balanceMicro} >= ${amountMicro}`,
    )
    .returning({ balanceMicro: credits.balanceMicro });

  if (!result) {
    // Update didn't match - insufficient balance
    const [current] = await db
      .select({ balanceMicro: credits.balanceMicro })
      .from(credits)
      .where(eq(credits.userId, userId))
      .limit(1);
    return { success: false, balanceMicro: current?.balanceMicro ?? 0 };
  }

  // Record the transaction after successful deduction
  await db.insert(creditTransactions).values({
    userId,
    deltaMicro: -amountMicro,
    source: reason,
    referenceId:
      typeof metadata.referenceId === 'string' ? metadata.referenceId : null,
    metadata,
  });

  return { success: true, balanceMicro: result.balanceMicro };
}

/**
 * Atomically settle credits after a bout completes.
 *
 * For additional charges (delta > 0, actual cost exceeded preauth), uses a
 * conditional UPDATE that caps the deduction at the user's available balance.
 * This eliminates the TOCTOU gap where a separate balance read + write could
 * be interleaved by concurrent transactions.
 *
 * For refunds (delta < 0, actual cost was less than preauth), applies the
 * credit unconditionally since adding funds can't overdraw.
 */
export async function settleCredits(
  userId: string,
  deltaMicro: number,
  reason: string,
  metadata: Record<string, unknown>,
) {
  const db = requireDb();

  if (deltaMicro > 0) {
    // Additional charge: cap at available balance atomically
    const [result] = await db
      .update(credits)
      .set({
        balanceMicro: sql`${credits.balanceMicro} - LEAST(${deltaMicro}, GREATEST(0, ${credits.balanceMicro}))`,
        updatedAt: new Date(),
      })
      .where(eq(credits.userId, userId))
      .returning({ balanceMicro: credits.balanceMicro });

    if (result) {
      await db.insert(creditTransactions).values({
        userId,
        deltaMicro: -deltaMicro,
        source: reason,
        referenceId:
          typeof metadata.referenceId === 'string' ? metadata.referenceId : null,
        metadata: { ...metadata, atomicSettlement: true },
      });
    }
  } else {
    // Refund: unconditionally add funds back
    await applyCreditDelta(userId, deltaMicro, reason, metadata);
  }
}
