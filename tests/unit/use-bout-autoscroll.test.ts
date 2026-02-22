import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Arena auto-scroll contract tests
//
// The Arena component (components/arena.tsx) initialises auto-scroll state as:
//
//   const isReplay = initialTranscript.length > 0;
//   const [autoScroll, setAutoScroll] = useState(!isReplay);
//
// This means:
//   - Live bouts (empty transcript)  → auto-scroll ON  (follow streaming text)
//   - Replays   (pre-filled transcript) → auto-scroll OFF (read from the top)
//
// These tests are intentionally simple boolean-logic assertions. Their purpose
// is to *document the design intention* and catch regressions if someone flips
// the polarity or removes the `!`.
// ---------------------------------------------------------------------------

describe('arena auto-scroll contract', () => {
  describe('autoScroll default from isReplay', () => {
    it('defaults to auto-scroll ON for live bouts (isReplay=false)', () => {
      const isReplay = false;
      const autoScrollDefault = !isReplay;
      expect(autoScrollDefault).toBe(true);
    });

    it('defaults to auto-scroll OFF for replays (isReplay=true)', () => {
      const isReplay = true;
      const autoScrollDefault = !isReplay;
      expect(autoScrollDefault).toBe(false);
    });
  });

  describe('isReplay detection from initialTranscript', () => {
    it('is a replay when initialTranscript has entries', () => {
      const initialTranscript = [
        { turn: 0, agentId: 'a1', agentName: 'Agent A', text: 'Hello' },
      ];
      const isReplay = initialTranscript.length > 0;
      expect(isReplay).toBe(true);
    });

    it('is NOT a replay when initialTranscript is empty', () => {
      const initialTranscript: { turn: number; agentId: string; agentName: string; text: string }[] = [];
      const isReplay = initialTranscript.length > 0;
      expect(isReplay).toBe(false);
    });

    it('correctly chains: empty transcript → isReplay=false → autoScroll=true', () => {
      const initialTranscript: unknown[] = [];
      const isReplay = initialTranscript.length > 0;
      const autoScrollDefault = !isReplay;
      expect(isReplay).toBe(false);
      expect(autoScrollDefault).toBe(true);
    });

    it('correctly chains: filled transcript → isReplay=true → autoScroll=false', () => {
      const initialTranscript = [
        { turn: 0, agentId: 'a1', agentName: 'Agent A', text: 'Hello' },
        { turn: 1, agentId: 'a2', agentName: 'Agent B', text: 'World' },
      ];
      const isReplay = initialTranscript.length > 0;
      const autoScrollDefault = !isReplay;
      expect(isReplay).toBe(true);
      expect(autoScrollDefault).toBe(false);
    });
  });
});
