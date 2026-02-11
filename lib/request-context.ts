// Request context extraction for observability.
//
// Extracts headers injected by middleware for use in structured log calls
// and downstream route handlers. All forensic headers (IP, UA, referer)
// are propagated from middleware to avoid re-parsing in every route.

/** Extract the request ID from middleware-injected headers. */
export function getRequestId(req: Request): string {
  return req.headers.get('x-request-id') ?? 'unknown';
}

/** Extract the client IP from middleware-injected headers. */
export function getClientIp(req: Request): string {
  return req.headers.get('x-client-ip') ?? 'unknown';
}

/** Extract the user agent from the request. */
export function getUserAgent(req: Request): string {
  return req.headers.get('user-agent') ?? '';
}

/** Extract the referer from the request. */
export function getReferer(req: Request): string {
  return req.headers.get('referer') ?? '';
}

/** Extract the client country from Vercel geo headers (via middleware). */
export function getClientCountry(req: Request): string {
  return req.headers.get('x-client-country') ?? '';
}
