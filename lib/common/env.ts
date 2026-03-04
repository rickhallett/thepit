// env.ts — Zod-validated environment variables.
//
// Lazy initialization: importing this module does not throw at build time.
// Call getEnv() to validate on first use; result is cached.

import { z } from "zod";

const boolFlag = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1")
  .pipe(z.boolean());

const baseSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),

  SUBSCRIPTIONS_ENABLED: boolFlag.default(false),
  CREDITS_ENABLED: boolFlag.default(false),
  BYOK_ENABLED: boolFlag.default(false),
  PREMIUM_ENABLED: boolFlag.default(false),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PASS_PRICE_ID: z.string().optional(),
  STRIPE_LAB_PRICE_ID: z.string().optional(),
});

const envSchema = baseSchema.superRefine((data, ctx) => {
  if (data.SUBSCRIPTIONS_ENABLED) {
    const required = [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PASS_PRICE_ID",
      "STRIPE_LAB_PRICE_ID",
    ] as const;
    for (const key of required) {
      if (!data[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${key} is required when SUBSCRIPTIONS_ENABLED is true`,
          path: [key],
        });
      }
    }
  }
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  cached = result.data;
  return cached;
}

/** Reset cached env — for testing only. */
export function _resetEnvCache(): void {
  cached = null;
}
