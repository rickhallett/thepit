/**
 * Centralized environment variable validation using Zod.
 *
 * Fail-fast: the server refuses to start if required variables are missing.
 * Optional variables use sensible defaults documented in .env.example.
 *
 * Usage:
 *   import { env } from '@/lib/env';
 *   env.DATABASE_URL   // string (validated)
 *   env.CREDITS_ENABLED // boolean (coerced from 'true'/'false')
 *
 * NOTE: NEXT_PUBLIC_* variables are NOT validated here — they are bundled
 * at build time by Next.js and accessed directly in client components.
 * Server-side env vars only.
 */

import { z } from 'zod/v4';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Coerce 'true'/'false' strings to boolean. Defaults to false. */
const boolFlag = z.string().optional().default('false').transform((v) => v === 'true');

/** Coerce string to number with a default. */
const numStr = (defaultValue: number) =>
  z.string().optional().default(String(defaultValue)).transform(Number);

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const serverEnvSchema = z.object({
  // --- Required ---
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),

  // --- Node environment ---
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),

  // --- Model configuration ---
  ANTHROPIC_FREE_MODEL: z.string().optional().default('claude-haiku-4-5-20251001'),
  ANTHROPIC_PREMIUM_MODEL: z.string().optional().default('claude-sonnet-4-5-20250929'),
  ANTHROPIC_PREMIUM_MODELS: z.string().optional().default('claude-sonnet-4-5-20250929,claude-opus-4-5-20251101,claude-opus-4-6'),
  ANTHROPIC_BYOK_MODEL: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
  ASK_THE_PIT_MODEL: z.string().optional(),

  // --- Feature flags ---
  PREMIUM_ENABLED: boolFlag,
  CREDITS_ENABLED: boolFlag,
  BYOK_ENABLED: boolFlag,
  SUBSCRIPTIONS_ENABLED: boolFlag,
  EAS_ENABLED: boolFlag,
  ASK_THE_PIT_ENABLED: boolFlag,
  CREDITS_ADMIN_ENABLED: boolFlag,
  HELICONE_ENABLED: boolFlag,

  // --- Credit economy ---
  CREDITS_STARTING_CREDITS: numStr(500),
  CREDIT_VALUE_GBP: numStr(0.01),
  CREDIT_PLATFORM_MARGIN: numStr(0.10),
  CREDIT_TOKEN_CHARS_PER: numStr(4),
  CREDIT_OUTPUT_TOKENS_PER_TURN: numStr(120),
  CREDIT_INPUT_FACTOR: numStr(5.5),
  CREDITS_ADMIN_GRANT: numStr(100),
  MODEL_PRICES_GBP_JSON: z.string().optional(),

  // --- BYOK ---
  BYOK_FEE_GBP_PER_1K_TOKENS: numStr(0.0002),
  BYOK_MIN_GBP: numStr(0.001),

  // --- Free bout pool ---
  FREE_BOUT_POOL_MAX: numStr(500),

  // --- Intro pool ---
  INTRO_POOL_TOTAL_CREDITS: numStr(15000),
  INTRO_POOL_DRAIN_PER_MIN: numStr(1),
  INTRO_SIGNUP_CREDITS: numStr(100),
  INTRO_REFERRAL_CREDITS: numStr(50),

  // --- Stripe (required when SUBSCRIPTIONS_ENABLED) ---
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PASS_PRICE_ID: z.string().optional(),
  STRIPE_LAB_PRICE_ID: z.string().optional(),

  // --- EAS (required when EAS_ENABLED) ---
  EAS_SIGNER_PRIVATE_KEY: z.string().optional(),
  EAS_RPC_URL: z.string().optional(),
  EAS_SCHEMA_UID: z.string().optional(),
  EAS_CHAIN_ID: numStr(8453),
  EAS_CONTRACT_ADDRESS: z.string().optional(),
  EAS_SCHEMA_REGISTRY_ADDRESS: z.string().optional(),

  // --- Contact form ---
  RESEND_API_KEY: z.string().optional(),
  CONTACT_TO_EMAIL: z.string().optional(),
  CONTACT_FROM_EMAIL: z.string().optional(),

  // --- Admin ---
  ADMIN_SEED_TOKEN: z.string().optional(),
  ADMIN_USER_IDS: z.string().optional(),

  // --- Remix rewards ---
  REMIX_REWARD_REMIXER_MICRO: numStr(0),
  REMIX_REWARD_SOURCE_OWNER_MICRO: numStr(0),

  // --- Research ---
  RESEARCH_ANONYMIZE_SALT: z.string().optional(),

  // --- App URLs ---
  APP_URL: z.string().optional(),

  // --- Observability ---
  HELICONE_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).optional().default('info'),

  // --- Analytics ---
  PV_INTERNAL_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    console.error('❌ Invalid environment variables:');
    console.error(formatted);

    // In production, crash hard. In dev/test, log and continue with partial config.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Environment validation failed:\n${formatted}`);
    }

    // Dev/test: return what we can parse, with defaults for missing required vars
    console.warn('⚠️  Continuing with partial config (development mode)');
    return serverEnvSchema.parse({
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost/dev',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'sk-ant-dev-placeholder',
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || 'sk_test_placeholder',
    });
  }

  return result.data;
}

/**
 * Validated server environment variables.
 *
 * Parsed and validated at module load time. In production, the process
 * will crash on startup if required variables are missing. In development,
 * a warning is logged and sensible defaults are used.
 */
export const env: ServerEnv = validateEnv();
