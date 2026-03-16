import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// useBoutVoting error state tests
//
// Verifies that voteError is set when the API call fails, and surfaces
// the correct error messages for different failure modes. The voting hook
// already exposes voteError - these tests lock the contract.
// ---------------------------------------------------------------------------

type StateSetter<T> = (val: T | ((prev: T) => T)) => void;

let capturedStates: Array<{ value: unknown; setter: StateSetter<unknown> }>;

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
  };
});

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

describe('useBoutVoting - error state', () => {
  beforeEach(() => {
    capturedStates = [];
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * useState call order in useBoutVoting:
   *   0: winnerVotes (WinnerVoteCounts)
   *   1: userVote (string | null)
   *   2: voteError (string | null)
   *   3: votePending (string | null)
   */
  async function setupHook() {
    vi.resetModules();
    const mod = await import('@/lib/use-bout-voting');
    const result = mod.useBoutVoting('bout-test');

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const voteErrorState = capturedStates[2]!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const votePendingState = capturedStates[3]!;

    return {
      voteErrorState,
      votePendingState,
      castWinnerVote: result.castWinnerVote,
    };
  }

  it('sets voteError when API returns 401', async () => {
    const { voteErrorState, castWinnerVote } = await setupHook();

    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    await castWinnerVote('agent-a');

    expect(voteErrorState.value).toBe('Sign in to cast a winner vote.');
  });

  it('sets voteError when API returns non-OK non-401', async () => {
    const { voteErrorState, castWinnerVote } = await setupHook();

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await castWinnerVote('agent-a');

    expect(voteErrorState.value).toBe('Vote failed. Try again.');
  });

  it('clears votePending after error', async () => {
    const { votePendingState, castWinnerVote } = await setupHook();

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await castWinnerVote('agent-a');

    expect(votePendingState.value).toBe(null);
  });

  it('does not set voteError on success', async () => {
    const { voteErrorState, castWinnerVote } = await setupHook();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await castWinnerVote('agent-a');

    expect(voteErrorState.value).toBe(null);
  });
});
