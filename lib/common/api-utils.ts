// API utilities — error responses, body parsing, rate limit responses.
// Used by all route handlers. No business logic.
// Note: parseValidBody consumes the request body stream (one-shot read).

import { z } from "zod";
import { NextRequest } from "next/server";

/** Standard error envelope for all API error responses. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Named error codes used across all routes. */
export const API_ERRORS = {
  INVALID_JSON: "INVALID_JSON",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS",
  RATE_LIMITED: "RATE_LIMITED",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL: "INTERNAL",
} as const;

/** Returns a JSON error response with the standard envelope. */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  const body: ApiError = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return Response.json(body, { status });
}

/**
 * Parses and validates a JSON request body against a Zod schema.
 * Returns parsed data on success, or an error Response on failure.
 */
export async function parseValidBody<T extends z.ZodType>(
  req: NextRequest,
  schema: T,
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: Response }
> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch (err) {
    // SyntaxError = malformed JSON from client → 400.
    // Anything else (stream failure, runtime fault) → 500.
    if (err instanceof SyntaxError) {
      return {
        success: false,
        response: errorResponse(
          400,
          API_ERRORS.INVALID_JSON,
          "Invalid JSON body",
        ),
      };
    }
    return {
      success: false,
      response: errorResponse(500, API_ERRORS.INTERNAL, "Failed to read request body"),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      response: errorResponse(
        400,
        API_ERRORS.VALIDATION_ERROR,
        "Request validation failed",
        result.error.flatten(),
      ),
    };
  }

  return { success: true, data: result.data };
}

/** Returns a 429 response with Retry-After header. */
export function rateLimitResponse(info: {
  remaining: number;
  resetAt: Date;
}): Response {
  const retryAfterSeconds = Math.ceil(
    (info.resetAt.getTime() - Date.now()) / 1000,
  );
  const body: ApiError = {
    error: { code: API_ERRORS.RATE_LIMITED, message: "Too many requests" },
  };
  return new Response(JSON.stringify(body), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.max(1, retryAfterSeconds)),
      "X-RateLimit-Remaining": String(info.remaining),
    },
  });
}
