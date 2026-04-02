// Client-safe credit utilities for display purposes.
//
// This module provides the same estimation and formatting functions as
// lib/credits.ts but without importing lib/env.ts. It reads process.env
// directly for values that Next.js inlines at build time, with sensible
// defaults matching the env.ts schema defaults.
//
// Why: lib/credits.ts imports lib/env.ts which runs Zod validation at
// module load time and throws in the browser where server env vars are
// undefined. Client components must use this module instead.

import { getModelPricing as registryPricing } from '@/lib/model-registry';

// --- Defaults (must match env.ts schema defaults) ---

const CREDIT_VALUE_GBP = Number(process.env.CREDIT_VALUE_GBP ?? '0.01');
const MICRO_PER_CREDIT = 100;
const MICRO_VALUE_GBP = CREDIT_VALUE_GBP / MICRO_PER_CREDIT;
const TOKEN_CHARS_PER = Number(process.env.CREDIT_TOKEN_CHARS_PER ?? '4');
const OUTPUT_TOKENS_PER_TURN = Number(
  process.env.CREDIT_OUTPUT_TOKENS_PER_TURN ?? '120',
);
const INPUT_FACTOR = Number(process.env.CREDIT_INPUT_FACTOR ?? '5.5');
const CREDIT_PLATFORM_MARGIN = Number(
  process.env.CREDIT_PLATFORM_MARGIN ?? '0.10',
);
const BYOK_FEE_GBP_PER_1K_TOKENS = Number(
  process.env.BYOK_FEE_GBP_PER_1K_TOKENS ?? '0.0002',
);
const BYOK_MIN_GBP = Number(process.env.BYOK_MIN_GBP ?? '0.001');

export const CREDITS_ENABLED = process.env.CREDITS_ENABLED === 'true';

// --- Model pricing (from registry) ---

const getModelPricing = (modelId: string) => registryPricing(modelId);

// --- Pure functions (same logic as lib/credits.ts) ---

export const toMicroCredits = (gbpAmount: number) =>
  Math.ceil(gbpAmount / MICRO_VALUE_GBP);

export const formatCredits = (micro: number) =>
  (micro / MICRO_PER_CREDIT).toFixed(2);

const estimateBoutTokens = (
  turns: number,
  outputTokensPerTurn = OUTPUT_TOKENS_PER_TURN,
) => {
  const outputTokens = Math.max(1, Math.ceil(turns * outputTokensPerTurn));
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
  const { inputTokens, outputTokens } = estimateBoutTokens(
    turns,
    outputTokensPerTurn,
  );
  const raw =
    (inputTokens * pricing.in + outputTokens * pricing.out) / 1_000_000;
  return raw * (1 + CREDIT_PLATFORM_MARGIN);
};
