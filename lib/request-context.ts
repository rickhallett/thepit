// Request context extraction for observability.
//
// Extracts the x-request-id header injected by middleware for use in
// structured log calls and response headers.

/** Extract the request ID from middleware-injected headers. */
export function getRequestId(req: Request): string {
  return req.headers.get('x-request-id') ?? 'unknown';
}
