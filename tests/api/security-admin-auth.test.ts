/**
 * S-01: grantTestCredits admin authorization
 * Ensures non-admin users cannot invoke the grant-credits server action.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { authMock, isAdminMock, applyCreditDeltaMock, redirectMock, ensureUserRecordMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    isAdminMock: vi.fn(),
    applyCreditDeltaMock: vi.fn().mockResolvedValue(undefined),
    redirectMock: vi.fn(() => {
      throw new Error('NEXT_REDIRECT');
    }),
    ensureUserRecordMock: vi.fn().mockResolvedValue(undefined),
  }));

vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }));
vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  revalidatePath: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/admin', () => ({ isAdmin: isAdminMock }));
vi.mock('@/lib/credits', () => ({
  applyCreditDelta: applyCreditDeltaMock,
  CREDITS_ADMIN_ENABLED: true,
  CREDITS_ADMIN_GRANT: 100,
  CREDITS_ENABLED: false,
  MICRO_PER_CREDIT: 100,
}));
vi.mock('@/lib/users', () => ({
  ensureUserRecord: ensureUserRecordMock,
}));
vi.mock('@/db', () => ({
  requireDb: () => ({ insert: vi.fn().mockReturnValue({ values: vi.fn() }) }),
}));
vi.mock('@/db/schema', () => ({
  agents: {},
  bouts: {},
  users: {},
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));
vi.mock('@/lib/presets', () => ({
  ARENA_PRESET_ID: 'arena',
  PRESETS: [],
  getPresetById: vi.fn(),
}));
vi.mock('@/lib/credit-catalog', () => ({ CREDIT_PACKAGES: [] }));
vi.mock('@/lib/stripe', () => ({ stripe: {} }));
vi.mock('@/lib/agent-registry', () => ({
  getAgentSnapshots: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/tier', () => ({ SUBSCRIPTIONS_ENABLED: false }));
vi.mock('@/lib/response-lengths', () => ({
  DEFAULT_RESPONSE_LENGTH: 'standard',
  resolveResponseLength: vi.fn(() => ({ id: 'standard', label: 'Standard', hint: '' })),
}));
vi.mock('@/lib/response-formats', () => ({
  DEFAULT_RESPONSE_FORMAT: 'spaced',
  resolveResponseFormat: vi.fn(() => ({ id: 'spaced', label: 'Text + spacing', hint: '' })),
}));
vi.mock('@/lib/form-utils', () => ({
  getFormString: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('grantTestCredits admin authorization', () => {
  it('rejects non-admin users with Unauthorized', async () => {
    authMock.mockResolvedValue({ userId: 'user_regular' });
    isAdminMock.mockReturnValue(false);

    const { grantTestCredits } = await import('@/app/actions');
    await expect(grantTestCredits()).rejects.toThrow('Unauthorized');
    expect(applyCreditDeltaMock).not.toHaveBeenCalled();
  });

  it('allows admin users to grant credits', async () => {
    authMock.mockResolvedValue({ userId: 'user_admin' });
    isAdminMock.mockReturnValue(true);

    const { grantTestCredits } = await import('@/app/actions');
    // Will throw NEXT_REDIRECT on success (redirect to /arena?credits=granted)
    await expect(grantTestCredits()).rejects.toThrow('NEXT_REDIRECT');
    expect(applyCreditDeltaMock).toHaveBeenCalled();
  });
});
