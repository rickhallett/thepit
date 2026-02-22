import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Share modal guard contract tests
//
// PR #334 fixed a bug where the share modal would fire before the bout even
// started. The fix in components/arena.tsx uses a two-part guard:
//
//   1. A `hasStreamedRef` ref that only becomes `true` when `status` is
//      `'streaming'` — this ensures the bout actually ran (not just jumped
//      to 'done' from a stale state).
//
//   2. The modal opens only when:
//        hasStreamedRef.current === true
//        && status === 'done'
//        && !isReplay
//
// These tests verify the boolean guard logic extracted from the component,
// without needing to render React or use hooks.
// ---------------------------------------------------------------------------

/** Mirrors the BoutStatus type from lib/use-bout.ts (not exported). */
type BoutStatus = 'idle' | 'streaming' | 'done' | 'error';

/**
 * Pure-logic extraction of the share modal guard from Arena.
 *
 * Returns whether the share modal should open, given the current state.
 */
function shouldOpenShareModal(
  status: BoutStatus,
  isReplay: boolean,
  hasStreamed: boolean,
): boolean {
  return hasStreamed && status === 'done' && !isReplay;
}

/**
 * Simulates the hasStreamedRef update logic: the ref becomes true
 * when status is 'streaming' and stays true thereafter.
 */
function updateHasStreamed(
  current: boolean,
  status: BoutStatus,
): boolean {
  if (status === 'streaming') return true;
  return current;
}

describe('share modal guard contract', () => {
  describe('shouldOpenShareModal', () => {
    it('should NOT trigger when status is idle (bout has not started)', () => {
      expect(shouldOpenShareModal('idle', false, false)).toBe(false);
    });

    it('should NOT trigger when status is idle even if hasStreamed is true', () => {
      // Edge case: status reset back to idle after streaming (shouldn't happen
      // in practice, but the guard should still block)
      expect(shouldOpenShareModal('idle', false, true)).toBe(false);
    });

    it('should NOT trigger when status is streaming (bout still running)', () => {
      expect(shouldOpenShareModal('streaming', false, true)).toBe(false);
    });

    it('should trigger when status is done AND hasStreamed is true AND not a replay', () => {
      expect(shouldOpenShareModal('done', false, true)).toBe(true);
    });

    it('should NOT trigger when status is done BUT hasStreamed is false', () => {
      // This is the exact bug PR #334 fixed: jumping straight to done
      // without ever streaming should NOT open the modal
      expect(shouldOpenShareModal('done', false, false)).toBe(false);
    });

    it('should NOT trigger for replays even when status is done and hasStreamed is true', () => {
      expect(shouldOpenShareModal('done', true, true)).toBe(false);
    });

    it('should NOT trigger on error status', () => {
      expect(shouldOpenShareModal('error', false, true)).toBe(false);
    });

    it('should NOT trigger on error status even without streaming', () => {
      expect(shouldOpenShareModal('error', false, false)).toBe(false);
    });
  });

  describe('updateHasStreamed (ref tracking)', () => {
    it('becomes true when status transitions to streaming', () => {
      const result = updateHasStreamed(false, 'streaming');
      expect(result).toBe(true);
    });

    it('stays true once set, regardless of subsequent status', () => {
      let hasStreamed = false;

      // idle → streaming → done lifecycle
      hasStreamed = updateHasStreamed(hasStreamed, 'idle');
      expect(hasStreamed).toBe(false);

      hasStreamed = updateHasStreamed(hasStreamed, 'streaming');
      expect(hasStreamed).toBe(true);

      hasStreamed = updateHasStreamed(hasStreamed, 'done');
      expect(hasStreamed).toBe(true);
    });

    it('never becomes true if status never reaches streaming', () => {
      let hasStreamed = false;

      hasStreamed = updateHasStreamed(hasStreamed, 'idle');
      expect(hasStreamed).toBe(false);

      hasStreamed = updateHasStreamed(hasStreamed, 'done');
      expect(hasStreamed).toBe(false);

      hasStreamed = updateHasStreamed(hasStreamed, 'error');
      expect(hasStreamed).toBe(false);
    });
  });

  describe('full lifecycle simulation', () => {
    it('live bout: idle → streaming → done opens modal', () => {
      const isReplay = false;
      let hasStreamed = false;
      const statuses: BoutStatus[] = ['idle', 'streaming', 'done'];

      const shouldOpenHistory: boolean[] = [];
      for (const status of statuses) {
        hasStreamed = updateHasStreamed(hasStreamed, status);
        shouldOpenHistory.push(
          shouldOpenShareModal(status, isReplay, hasStreamed),
        );
      }

      // Only the final 'done' state should trigger the modal
      expect(shouldOpenHistory).toEqual([false, false, true]);
    });

    it('replay: idle → done never opens modal', () => {
      const isReplay = true;
      let hasStreamed = false;
      const statuses: BoutStatus[] = ['idle', 'done'];

      const shouldOpenHistory: boolean[] = [];
      for (const status of statuses) {
        hasStreamed = updateHasStreamed(hasStreamed, status);
        shouldOpenHistory.push(
          shouldOpenShareModal(status, isReplay, hasStreamed),
        );
      }

      expect(shouldOpenHistory).toEqual([false, false]);
    });

    it('error bout: idle → streaming → error never opens modal', () => {
      const isReplay = false;
      let hasStreamed = false;
      const statuses: BoutStatus[] = ['idle', 'streaming', 'error'];

      const shouldOpenHistory: boolean[] = [];
      for (const status of statuses) {
        hasStreamed = updateHasStreamed(hasStreamed, status);
        shouldOpenHistory.push(
          shouldOpenShareModal(status, isReplay, hasStreamed),
        );
      }

      expect(shouldOpenHistory).toEqual([false, false, false]);
    });
  });
});
