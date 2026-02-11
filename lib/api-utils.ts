// Shared API route utilities for consistent request parsing and error responses.
//
// Every API route should use these helpers instead of hand-rolling
// `new Response(string, { status })` to ensure all errors are JSON,
// use consistent wording, and include required headers (e.g. Retry-After).

import type { RateLimitResult } from '@/lib/rate-limit';

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

/**
 * Create a 429 rate-limit response with standard Retry-After and
 * X-RateLimit-* headers. Uses the RateLimitResult from lib/rate-limit.
 */
export function rateLimitResponse(
  result: RateLimitResult,
  message?: string,
): Response {
  const retryAfterSec = Math.ceil(
    Math.max(0, result.resetAt - Date.now()) / 1000,
  );
  return errorResponse(message ?? API_ERRORS.RATE_LIMITED, 429, {
    headers: {
      'Retry-After': String(retryAfterSec),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(result.resetAt),
    },
  });
}

// ─── Request parsing ────────────────────────────────────────────────────────

/**
 * Parse a JSON request body with standardized error handling.
 * Returns a discriminated union: either the parsed data or an error Response.
 */
export async function parseJsonBody<T>(
  req: Request,
): Promise<{ data: T; error?: never } | { data?: never; error: Response }> {
  try {
    const data = await req.json();
    return { data: data as T };
  } catch {
    return { error: errorResponse(API_ERRORS.INVALID_JSON, 400) };
  }
}
