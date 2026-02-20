/**
 * Canonical client IP resolution.
 *
 * Single source of truth for extracting the client IP from request headers.
 * Used by middleware (to propagate x-client-ip) and rate limiting (to identify clients).
 *
 * On Vercel, x-vercel-forwarded-for is the most trustworthy header — set at the
 * edge network and not spoofable by clients. For standard reverse proxies,
 * the rightmost x-forwarded-for entry is used (appended by the trusted proxy),
 * NOT the leftmost (which is client-controlled and spoofable).
 */

/**
 * Resolve the client IP address from request headers.
 *
 * Priority:
 *   1. x-vercel-forwarded-for (Vercel edge, trusted)
 *   2. x-forwarded-for rightmost entry (proxy-appended, trusted)
 *   3. x-real-ip (fallback)
 *   4. 'unknown' (should not happen in production)
 */
export function resolveClientIp(headers: Headers): string {
  // Vercel's trusted header — set at the edge, not spoofable by clients
  const vercelForwarded = headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) {
    return vercelForwarded.split(',')[0]!.trim();
  }

  // Standard: rightmost entry is appended by the trusted proxy
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((s) => s.trim());
    return parts[parts.length - 1]!;
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}
