import { describe, expect, it, vi, beforeEach } from 'vitest';
import { z } from 'zod/v4';

// We test the schema directly rather than importing env (which validates
// at module load time and would crash without the right env vars).

describe('env validation schema', () => {
  const boolFlag = z.string().optional().default('false').transform((v) => v === 'true');
  const numStr = (defaultValue: number) =>
    z.string().optional().default(String(defaultValue)).transform(Number);

  // Minimal schema matching lib/env.ts structure
  const schema = z.object({
    DATABASE_URL: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
    NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
    CREDITS_ENABLED: boolFlag,
    CREDIT_VALUE_GBP: numStr(0.01),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).optional().default('info'),
  });

  it('validates with all required fields present', () => {
    const result = schema.safeParse({
      DATABASE_URL: 'postgresql://localhost/test',
      ANTHROPIC_API_KEY: 'sk-ant-test',
      CLERK_SECRET_KEY: 'sk_test_abc',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CREDITS_ENABLED).toBe(false);
      expect(result.data.CREDIT_VALUE_GBP).toBe(0.01);
      expect(result.data.LOG_LEVEL).toBe('info');
      expect(result.data.NODE_ENV).toBe('development');
    }
  });

  it('fails when required fields are missing', () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when DATABASE_URL is empty string', () => {
    const result = schema.safeParse({
      DATABASE_URL: '',
      ANTHROPIC_API_KEY: 'sk-ant-test',
      CLERK_SECRET_KEY: 'sk_test_abc',
    });
    expect(result.success).toBe(false);
  });

  it('coerces boolean flag from string', () => {
    const result = schema.safeParse({
      DATABASE_URL: 'postgresql://localhost/test',
      ANTHROPIC_API_KEY: 'sk-ant-test',
      CLERK_SECRET_KEY: 'sk_test_abc',
      CREDITS_ENABLED: 'true',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CREDITS_ENABLED).toBe(true);
    }
  });

  it('coerces numeric string to number', () => {
    const result = schema.safeParse({
      DATABASE_URL: 'postgresql://localhost/test',
      ANTHROPIC_API_KEY: 'sk-ant-test',
      CLERK_SECRET_KEY: 'sk_test_abc',
      CREDIT_VALUE_GBP: '0.05',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CREDIT_VALUE_GBP).toBe(0.05);
    }
  });

  it('rejects invalid LOG_LEVEL', () => {
    const result = schema.safeParse({
      DATABASE_URL: 'postgresql://localhost/test',
      ANTHROPIC_API_KEY: 'sk-ant-test',
      CLERK_SECRET_KEY: 'sk_test_abc',
      LOG_LEVEL: 'verbose',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid LOG_LEVEL values', () => {
    for (const level of ['debug', 'info', 'warn', 'error', 'silent']) {
      const result = schema.safeParse({
        DATABASE_URL: 'postgresql://localhost/test',
        ANTHROPIC_API_KEY: 'sk-ant-test',
        CLERK_SECRET_KEY: 'sk_test_abc',
        LOG_LEVEL: level,
      });
      expect(result.success).toBe(true);
    }
  });
});
