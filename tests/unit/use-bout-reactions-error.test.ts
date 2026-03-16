import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// useBoutReactions error state tests
//
// The hook is a React hook (useState, useRef, useCallback) so we cannot call
// it outside a React render tree without @testing-library/react. Instead, we
// test the error state contract by extracting and verifying the behavior:
//
// 1. When fetch returns non-OK, error state is set
// 2. Error auto-dismisses after 3 seconds
// 3. Error is cleared on next successful reaction
//
// We mock React's hooks to capture state changes, then drive the hook's
// sendReaction callback directly.
// ---------------------------------------------------------------------------

// Captured state setters from useState calls
type StateSetter<T> = (val: T | ((prev: T) => T)) => void;

let capturedStates: Array<{ value: unknown; setter: StateSetter<unknown> }>;
let capturedRefs: Array<{ current: unknown }>;
let capturedCallbacks: Array<(...args: unknown[]) => unknown>;

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.mock('react', () => {
  return {
    useState: (init: unknown) => {
      const val = typeof init === 'function' ? (init as () => unknown)() : init;
      const entry = { value: val, setter: vi.fn((v: unknown) => {
        entry.value = typeof v === 'function' ? (v as (prev: unknown) => unknown)(entry.value) : v;
      }) };
      capturedStates.push(entry as { value: unknown; setter: StateSetter<unknown> });
      return [entry.value, entry.setter];
    },
    useRef: (init: unknown) => {
      const ref = { current: init };
      capturedRefs.push(ref);
      return ref;
    },
    useCallback: (fn: (...args: unknown[]) => unknown) => {
      capturedCallbacks.push(fn);
      return fn;
    },
  };
});

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

describe('useBoutReactions - error state', () => {
  beforeEach(() => {
    capturedStates = [];
    capturedRefs = [];
    capturedCallbacks = [];
    vi.useFakeTimers();
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /**
   * Helper: import the hook fresh (after mocks are wired) and call it.
   * Returns the sendReaction callback and the error state entry.
   *
   * useState call order in useBoutReactions:
   *   0: reactions (ReactionCountMap)
   *   1: userReactions (UserReactionSet)
   *   2: reactionError (string | null)
   *
   * useCallback call order:
   *   0: hasReacted
   *   1: sendReaction
   */
  async function setupHook() {
    vi.resetModules();
    const mod = await import('@/lib/use-bout-reactions');
    mod.useBoutReactions('bout-test');

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const errorState = capturedStates[2]!;
    const sendReaction = capturedCallbacks[1] as (
      turn: number,
      type: 'heart' | 'fire',
    ) => Promise<void>;

    return { errorState, sendReaction };
  }

  it('sets reactionError when API returns non-OK', async () => {
    const { errorState, sendReaction } = await setupHook();

    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

    await sendReaction(0, 'heart');

    expect(errorState.value).toBe('Failed to save reaction');
  });

  it('sets reactionError when fetch throws', async () => {
    const { errorState, sendReaction } = await setupHook();

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await sendReaction(0, 'fire');

    expect(errorState.value).toBe('Failed to save reaction');
  });

  it('auto-clears error after 3 seconds', async () => {
    const { errorState, sendReaction } = await setupHook();

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await sendReaction(0, 'heart');
    expect(errorState.value).toBe('Failed to save reaction');

    vi.advanceTimersByTime(3000);
    // The setter should have been called with null
    expect(errorState.value).toBe(null);
  });

  it('does not set error on successful reaction', async () => {
    const { errorState, sendReaction } = await setupHook();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ counts: { heart: 1, fire: 0 }, turnIndex: 0, action: 'added' }),
    });

    await sendReaction(0, 'heart');

    expect(errorState.value).toBe(null);
  });

  it('resets dismiss timer on consecutive errors', async () => {
    const { errorState, sendReaction } = await setupHook();

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await sendReaction(0, 'heart');
    expect(errorState.value).toBe('Failed to save reaction');

    // Advance 2s, then trigger another error
    vi.advanceTimersByTime(2000);
    expect(errorState.value).toBe('Failed to save reaction');

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await sendReaction(1, 'fire');

    // First timer would have fired at 3s, but was cleared.
    // Advance another 2s (4s total) - error should still be present
    vi.advanceTimersByTime(2000);
    expect(errorState.value).toBe('Failed to save reaction');

    // Advance to 3s from second error - now it should clear
    vi.advanceTimersByTime(1000);
    expect(errorState.value).toBe(null);
  });
});
