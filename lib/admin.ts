// Admin authorization: checks user IDs against a comma-separated allowlist.

import { env } from '@/lib/env';

const ADMIN_USER_IDS = (env.ADMIN_USER_IDS ?? '').split(',').filter(Boolean);

export function isAdmin(userId: string | null): boolean {
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId);
}
