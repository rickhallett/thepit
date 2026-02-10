const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS ?? '').split(',').filter(Boolean);

export function isAdmin(userId: string | null): boolean {
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId);
}
