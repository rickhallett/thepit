import { eq, sql } from 'drizzle-orm';

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
  process.env.CREDIT_PLATFORM_MARGIN ?? '0.25',
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

const DEFAULT_MODEL_PRICES_GBP: Record<string, { in: number; out: number }> = {
  'claude-haiku-4-5-20251001': { in: 1, out: 5 },
  'claude-sonnet-4-5-20250929': { in: 3, out: 15 },
  'claude-opus-4-5-20251101': { in: 5, out: 25 },
  'claude-opus-4-6': { in: 5, out: 25 },
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

  const [created] = await db
    .insert(credits)
    .values({
      userId,
      balanceMicro,
    })
    .returning();

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
