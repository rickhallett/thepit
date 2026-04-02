import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  authMock,
  mockGetCopy,
  mockGetAgentSnapshots,
  mockGetUserTier,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  mockGetCopy: vi.fn(),
  mockGetAgentSnapshots: vi.fn(),
  mockGetUserTier: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/lib/copy', () => ({
  getCopy: mockGetCopy,
}));

vi.mock('@/lib/agent-registry', () => ({
  getAgentSnapshots: mockGetAgentSnapshots,
}));

vi.mock('@/lib/tier', () => ({
  getUserTier: mockGetUserTier,
  SUBSCRIPTIONS_ENABLED: true,
}));

vi.mock('@/lib/model-registry', () => ({
  DEFAULT_PREMIUM_MODEL: 'openai/gpt-5.4',
  PREMIUM_MODEL_IDS: ['openai/gpt-5.4', 'anthropic/claude-sonnet-4-6'],
  getInputTokenBudget: vi.fn(() => 170_000),
}));

vi.mock('@/lib/credits', () => ({
  BYOK_ENABLED: true,
}));

vi.mock('@/lib/env', () => ({
  env: { DEMO_MODE_ENABLED: false },
}));

vi.mock('next/link', () => ({
  default: vi.fn((props: { href: string }) => ({ type: 'Link', props })),
}));

vi.mock('@/app/actions', () => ({
  createArenaBout: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import ArenaBuilderPage from '@/app/arena/custom/page';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find a component by type name in a React element tree.
 * Returns the props of the first matching element.
 */
function findComponentProps(
  element: unknown,
  componentName: string,
): Record<string, unknown> | null {
  if (!element || typeof element !== 'object') return null;

  const el = element as {
    type?: { name?: string } | string;
    props?: { children?: unknown } & Record<string, unknown>;
  };

  // Check if this element matches
  const typeName = typeof el.type === 'function'
    ? (el.type as { name?: string }).name
    : typeof el.type === 'string'
      ? el.type
      : null;

  if (typeName === componentName && el.props) {
    return el.props;
  }

  // Search children
  if (el.props?.children) {
    const children = Array.isArray(el.props.children)
      ? el.props.children
      : [el.props.children];

    for (const child of children) {
      const found = findComponentProps(child, componentName);
      if (found) return found;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const mockCopy = {
  arenaBuilderPage: {
    label: 'Custom Arena',
    titleNew: 'Build Your Arena',
    titleReroll: 'Re-roll Arena',
    descriptionNew: 'Select agents for your bout.',
    descriptionReroll: 'Re-roll with different agents.',
    footerTagline: 'The Pit',
    backToPresets: 'Back to Presets',
  },
};

const mockAgents = [
  { id: 'agent-1', name: 'Agent One', presetName: 'preset-1', color: '#ff0000', avatar: '/a1.png' },
  { id: 'agent-2', name: 'Agent Two', presetName: 'preset-2', color: '#00ff00', avatar: '/a2.png' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ArenaBuilderPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetCopy.mockResolvedValue(mockCopy);
    mockGetAgentSnapshots.mockResolvedValue(mockAgents);
    authMock.mockResolvedValue({ userId: 'user_test' });
    mockGetUserTier.mockResolvedValue('free');
    process.env.PREMIUM_ENABLED = 'true';
  });

  // ================================================================
  // Search param passthrough
  // ================================================================
  describe('search param passthrough', () => {
    it('passes empty initialAgentIds when no agent param', async () => {
      const result = await ArenaBuilderPage({ searchParams: Promise.resolve({}) });
      const props = findComponentProps(result, 'ArenaBuilder');

      expect(props).not.toBeNull();
      expect(props?.initialAgentIds).toEqual([]);
      expect(props?.initialTopic).toBe('');
    });

    it('passes single agent as array', async () => {
      const result = await ArenaBuilderPage({
        searchParams: Promise.resolve({ agent: 'agent-1' }),
      });
      const props = findComponentProps(result, 'ArenaBuilder');

      expect(props?.initialAgentIds).toEqual(['agent-1']);
    });

    it('passes multiple agents as array', async () => {
      const result = await ArenaBuilderPage({
        searchParams: Promise.resolve({ agent: ['agent-1', 'agent-2'] }),
      });
      const props = findComponentProps(result, 'ArenaBuilder');

      expect(props?.initialAgentIds).toEqual(['agent-1', 'agent-2']);
    });

    it('passes topic param', async () => {
      const result = await ArenaBuilderPage({
        searchParams: Promise.resolve({ topic: 'AI ethics' }),
      });
      const props = findComponentProps(result, 'ArenaBuilder');

      expect(props?.initialTopic).toBe('AI ethics');
    });

    it('handles from param for re-roll context', async () => {
      const result = await ArenaBuilderPage({
        searchParams: Promise.resolve({ from: 'bout-123' }),
      });

      // Verify the page rendered without error
      expect(result).toBeDefined();
    });
  });

  // ================================================================
  // Tier/BYOK enablement logic
  // ================================================================
  describe('tier/BYOK enablement logic', () => {
    it('disables BYOK for free tier users', async () => {
      mockGetUserTier.mockResolvedValue('free');

      const result = await ArenaBuilderPage({ searchParams: Promise.resolve({}) });
      const props = findComponentProps(result, 'ArenaBuilder');

      expect(props?.byokEnabled).toBe(false);
    });

    it('enables BYOK for pass tier users', async () => {
      mockGetUserTier.mockResolvedValue('pass');

      const result = await ArenaBuilderPage({ searchParams: Promise.resolve({}) });
      const props = findComponentProps(result, 'ArenaBuilder');

      expect(props?.byokEnabled).toBe(true);
    });

    it('enables BYOK for lab tier users', async () => {
      mockGetUserTier.mockResolvedValue('lab');

      const result = await ArenaBuilderPage({ searchParams: Promise.resolve({}) });
      const props = findComponentProps(result, 'ArenaBuilder');

      expect(props?.byokEnabled).toBe(true);
    });

    it('allows BYOK for unauthenticated users when tier check is skipped', async () => {
      authMock.mockResolvedValue({ userId: null });

      const result = await ArenaBuilderPage({ searchParams: Promise.resolve({}) });
      const props = findComponentProps(result, 'ArenaBuilder');

      // When not authenticated and SUBSCRIPTIONS_ENABLED, userTier is null
      // byokEnabled = BYOK_ENABLED && userTier !== 'free'
      // null !== 'free' is true, so byokEnabled is true (assuming BYOK_ENABLED is true)
      expect(props?.byokEnabled).toBe(true);
    });

    it('disables BYOK when BYOK_ENABLED is false', async () => {
      // Re-mock credits with BYOK_ENABLED = false
      vi.doMock('@/lib/credits', () => ({
        BYOK_ENABLED: false,
      }));

      vi.resetModules();
      const { default: Page } = await import('@/app/arena/custom/page');

      mockGetUserTier.mockResolvedValue('lab');
      mockGetCopy.mockResolvedValue(mockCopy);
      mockGetAgentSnapshots.mockResolvedValue(mockAgents);
      authMock.mockResolvedValue({ userId: 'user_test' });

      const result = await Page({ searchParams: Promise.resolve({}) });
      const props = findComponentProps(result, 'ArenaBuilder');

      expect(props?.byokEnabled).toBe(false);
    });
  });

  // ================================================================
  // Demo mode behavior
  // ================================================================
  describe('demo mode behavior', () => {
    it('passes demoMode=false when DEMO_MODE_ENABLED is false', async () => {
      const result = await ArenaBuilderPage({ searchParams: Promise.resolve({}) });
      const props = findComponentProps(result, 'ArenaBuilder');

      expect(props?.demoMode).toBe(false);
    });

    it('passes demoMode=true when DEMO_MODE_ENABLED is true', async () => {
      vi.doMock('@/lib/env', () => ({
        env: { DEMO_MODE_ENABLED: true },
      }));

      vi.resetModules();
      const { default: Page } = await import('@/app/arena/custom/page');

      mockGetCopy.mockResolvedValue(mockCopy);
      mockGetAgentSnapshots.mockResolvedValue(mockAgents);
      authMock.mockResolvedValue({ userId: 'user_test' });
      mockGetUserTier.mockResolvedValue('free');

      const result = await Page({ searchParams: Promise.resolve({}) });
      const props = findComponentProps(result, 'ArenaBuilder');

      expect(props?.demoMode).toBe(true);
    });
  });

  // ================================================================
  // Agent data passthrough
  // ================================================================
  describe('agent data passthrough', () => {
    it('maps agent snapshots to ArenaBuilder props', async () => {
      const result = await ArenaBuilderPage({ searchParams: Promise.resolve({}) });
      const props = findComponentProps(result, 'ArenaBuilder');

      expect(props?.agents).toEqual([
        { id: 'agent-1', name: 'Agent One', presetName: 'preset-1', color: '#ff0000', avatar: '/a1.png' },
        { id: 'agent-2', name: 'Agent Two', presetName: 'preset-2', color: '#00ff00', avatar: '/a2.png' },
      ]);
    });
  });

  // ================================================================
  // Premium model configuration
  // ================================================================
  describe('premium model configuration', () => {
    it('passes premium configuration to ArenaBuilder', async () => {
      const result = await ArenaBuilderPage({ searchParams: Promise.resolve({}) });
      const props = findComponentProps(result, 'ArenaBuilder');

      expect(props?.premiumEnabled).toBe(true);
      expect(props?.premiumModels).toEqual(['openai/gpt-5.4', 'anthropic/claude-sonnet-4-6']);
      expect(props?.defaultPremiumModel).toBe('openai/gpt-5.4');
    });

    it('passes premiumEnabled=false when PREMIUM_ENABLED is not set', async () => {
      delete process.env.PREMIUM_ENABLED;

      const result = await ArenaBuilderPage({ searchParams: Promise.resolve({}) });
      const props = findComponentProps(result, 'ArenaBuilder');

      expect(props?.premiumEnabled).toBe(false);
    });
  });
});
