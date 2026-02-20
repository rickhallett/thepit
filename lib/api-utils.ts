// Shared API route utilities for consistent request parsing and error responses.
//
// Every API route should use these helpers instead of hand-rolling
// `new Response(string, { status })` to ensure all errors are JSON,
// use consistent wording, and include required headers (e.g. Retry-After).

import type { RateLimitResult } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

// ─── Standard error messages ────────────────────────────────────────────────

export const API_ERRORS = {
  AUTH_REQUIRED: 'Authentication required.',
  FORBIDDEN: 'Forbidden.',
  INVALID_JSON: 'Invalid JSON.',
  NOT_FOUND: 'Not found.',
  RATE_LIMITED: 'Rate limit exceeded.',
  INTERNAL: 'Internal server error.',
  SERVICE_UNAVAILABLE: 'Service unavailable.',
  UNSAFE_CONTENT: 'Input contains disallowed content.',
} as const;

// ─── Error response factory ─────────────────────────────────────────────────

/**
 * Create a standardized JSON error response.
 * All API routes should use this for consistent error contracts.
 *
 * Response body shape: `{ error: string, code?: string }`
 */
export function errorResponse(
  message: string,
  status: number,
  options?: { code?: string; headers?: Record<string, string> },
): Response {
  const body: Record<string, string> = { error: message };
  if (options?.code) body.code = options.code;

  return Response.json(body, {
    status,
    headers: options?.headers,
  });
}

/** Upgrade tier metadata included in 429 responses. */
export type UpgradeTier = {
  tier: string;
  limit: number | null;
  url: string;
};

/** Options for enriching rate-limit responses with upgrade context. */
export type RateLimitResponseOptions = {
  message?: string;
  /** Max requests allowed in the current window. */
  limit?: number;
  /** User's current subscription tier. */
  currentTier?: string;
  /** Available upgrade tiers with their limits. */
  upgradeTiers?: UpgradeTier[];
};

/**
 * Create a 429 rate-limit response with standard Retry-After and
 * X-RateLimit-* headers. Uses the RateLimitResult from lib/rate-limit.
 *
 * When `currentTier` and `upgradeTiers` are provided, the response body
 * includes structured metadata the frontend can use to show a contextual
 * upgrade prompt instead of a generic error message.
 *
 * Also emits a `log.security` event for observability — every rate limit
 * hit is automatically logged with request context from AsyncLocalStorage.
 */
export function rateLimitResponse(
  result: RateLimitResult,
  options?: string | RateLimitResponseOptions,
): Response {
  // Backward compat: accept a plain string as the message.
  const opts: RateLimitResponseOptions =
    typeof options === 'string' ? { message: options } : (options ?? {});

  const retryAfterSec = Math.ceil(
    Math.max(0, result.resetAt - Date.now()) / 1000,
  );

  log.security('rate_limit_exceeded', {
    retryAfterSec,
    resetAt: result.resetAt,
    currentTier: opts.currentTier,
  });

  const body: Record<string, unknown> = {
    error: opts.message ?? API_ERRORS.RATE_LIMITED,
    code: 'RATE_LIMITED',
    remaining: result.remaining,
    resetAt: result.resetAt,
  };

  if (opts.limit !== undefined) body.limit = opts.limit;
  if (opts.currentTier) body.currentTier = opts.currentTier;
  if (opts.upgradeTiers && opts.upgradeTiers.length > 0) {
    body.upgradeTiers = opts.upgradeTiers;
  }

  return Response.json(body, {
    status: 429,
    headers: {
      'Retry-After': String(retryAfterSec),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(result.resetAt),
    },
  });
}

// ─── Validated request parsing (Zod) ────────────────────────────────────────

/**
 * Parse and validate a JSON request body against a Zod schema.
 * Combines JSON parsing + runtime type validation in one step.
 *
 * Returns the first Zod error message as the 400 response body,
 * preserving the same error message style as the manual validation
 * that this replaces.
 *
 * @example
 *   import { contactSchema } from '@/lib/api-schemas';
 *   const parsed = await parseValidBody(req, contactSchema);
 *   if (parsed.error) return parsed.error;
 *   const { name, email, message } = parsed.data;
 */
export async function parseValidBody<T>(
  req: Request,
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: { issues: Array<{ message: string }> } } },
): Promise<{ data: T; error?: never } | { data?: never; error: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: errorResponse(API_ERRORS.INVALID_JSON, 400) };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    // Return the first validation error — matches the existing pattern
    // of returning a single error message per request.
    //
    // Zod's default "Invalid input: expected X, received Y" messages are
    // replaced with the field's custom message when one is defined via
    // .min()/.max()/.refine(). For missing-field type errors that don't
    // hit those refinements, we still get the descriptive Zod default.
    const firstIssue = result.error.issues[0]?.message ?? 'Invalid request body.';
    return { error: errorResponse(firstIssue, 400) };
  }

  return { data: result.data };
}
