// Shared API route utilities for consistent request parsing and error responses.

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
    return { error: errorResponse('Invalid JSON.', 400) };
  }
}

/**
 * Create a standardized JSON error response.
 * All API routes should use this for consistent error contracts.
 */
export function errorResponse(message: string, status: number): Response {
  return Response.json(
    { error: message },
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}
