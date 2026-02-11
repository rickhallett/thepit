// Shared admin authentication for admin API routes.

import { timingSafeEqual } from 'crypto';

/**
 * Validate an admin request using timing-safe token comparison.
 * Throws if the token is missing, mismatched, or the server is not configured.
 */
export function requireAdmin(req: Request): void {
  const token = req.headers.get('x-admin-token');
  const expected = process.env.ADMIN_SEED_TOKEN;
  if (!expected) {
    throw new Error('Not configured.');
  }
  if (!token) {
    throw new Error('Unauthorized');
  }
  // Constant-time comparison to prevent timing side-channel attacks.
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    throw new Error('Unauthorized');
  }
  if (!timingSafeEqual(a, b)) {
    throw new Error('Unauthorized');
  }
}
