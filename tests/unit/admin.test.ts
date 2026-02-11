import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('admin', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns true for admin user ID', async () => {
    vi.stubEnv('ADMIN_USER_IDS', 'user_admin_1,user_admin_2');
    const { isAdmin } = await import('@/lib/admin');
    expect(isAdmin('user_admin_1')).toBe(true);
  });

  it('returns false for non-admin ID', async () => {
    vi.stubEnv('ADMIN_USER_IDS', 'user_admin_1,user_admin_2');
    const { isAdmin } = await import('@/lib/admin');
    expect(isAdmin('user_regular')).toBe(false);
  });

  it('returns false for null', async () => {
    vi.stubEnv('ADMIN_USER_IDS', 'user_admin_1');
    const { isAdmin } = await import('@/lib/admin');
    expect(isAdmin(null)).toBe(false);
  });

  it('returns false when ADMIN_USER_IDS is empty', async () => {
    vi.stubEnv('ADMIN_USER_IDS', '');
    const { isAdmin } = await import('@/lib/admin');
    expect(isAdmin('anyone')).toBe(false);
  });
});
