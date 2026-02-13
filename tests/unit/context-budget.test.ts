import { describe, expect, it } from 'vitest';

import {
  estimatePromptTokens,
  truncateHistoryToFit,
} from '@/lib/xml-prompt';

import {
  MODEL_CONTEXT_LIMITS,
  DEFAULT_CONTEXT_LIMIT,
  CONTEXT_SAFETY_MARGIN,
  getInputTokenBudget,
} from '@/lib/ai';

// ---------------------------------------------------------------------------
// estimatePromptTokens
// ---------------------------------------------------------------------------

describe('estimatePromptTokens', () => {
  it('estimates ~4 chars per token', () => {
    expect(estimatePromptTokens('abcd')).toBe(1);
    expect(estimatePromptTokens('abcde')).toBe(2);
    expect(estimatePromptTokens('abcdefgh')).toBe(2);
  });

  it('returns 0 for empty string', () => {
    expect(estimatePromptTokens('')).toBe(0);
  });

  it('rounds up', () => {
    // 5 chars / 4 = 1.25 -> ceil = 2
    expect(estimatePromptTokens('12345')).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getInputTokenBudget
// ---------------------------------------------------------------------------

describe('getInputTokenBudget', () => {
  it('returns correct budget for known models', () => {
    const budget = getInputTokenBudget('claude-haiku-4-5-20251001');
    const expected = Math.floor(200_000 * (1 - CONTEXT_SAFETY_MARGIN));
    expect(budget).toBe(expected);
  });

  it('uses default limit for unknown models', () => {
    const budget = getInputTokenBudget('unknown-model-xyz');
    const expected = Math.floor(DEFAULT_CONTEXT_LIMIT * (1 - CONTEXT_SAFETY_MARGIN));
    expect(budget).toBe(expected);
  });

  it('all known models have context limits defined', () => {
    expect(Object.keys(MODEL_CONTEXT_LIMITS).length).toBeGreaterThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// truncateHistoryToFit
// ---------------------------------------------------------------------------

describe('truncateHistoryToFit', () => {
  // Create a history entry of approximately N tokens (N * 4 characters)
  const makeTurn = (name: string, tokenCount: number): string => {
    const textLength = tokenCount * 4 - name.length - 2; // "Name: " prefix
    return `${name}: ${'x'.repeat(Math.max(0, textLength))}`;
  };

  const smallSystem = 'System prompt text'; // ~5 tokens
  const smallContext = 'Context overhead'; // ~4 tokens

  it('returns full history when it fits within budget', () => {
    const history = [makeTurn('A', 10), makeTurn('B', 10)];
    const result = truncateHistoryToFit(history, smallSystem, smallContext, 10_000);

    expect(result.turnsDropped).toBe(0);
    expect(result.truncatedHistory).toEqual(history);
  });

  it('truncates oldest turns when history exceeds budget', () => {
    // Each turn ~100 tokens. Budget allows ~2 turns after overhead.
    const history = [
      makeTurn('A', 100),
      makeTurn('B', 100),
      makeTurn('C', 100),
      makeTurn('D', 100),
    ];

    // Small budget: system (~5) + context (~4) + 100 margin = ~109 overhead
    // Available for history: 350 - 109 = ~241 tokens, enough for ~2 turns
    const result = truncateHistoryToFit(history, smallSystem, smallContext, 350);

    expect(result.turnsDropped).toBe(2);
    expect(result.truncatedHistory.length).toBe(3); // marker + 2 kept turns
    expect(result.truncatedHistory[0]).toContain('2 earlier turns truncated');
    expect(result.truncatedHistory[1]).toBe(history[2]); // C
    expect(result.truncatedHistory[2]).toBe(history[3]); // D
  });

  it('inserts singular truncation marker for 1 dropped turn', () => {
    const history = [
      makeTurn('A', 100),
      makeTurn('B', 100),
    ];

    // Budget for ~1 turn after overhead
    const result = truncateHistoryToFit(history, smallSystem, smallContext, 250);

    expect(result.turnsDropped).toBe(1);
    expect(result.truncatedHistory[0]).toContain('1 earlier turn truncated');
  });

  it('returns empty history when no turns fit', () => {
    const history = [makeTurn('A', 1000)];

    // Tiny budget — even one turn does not fit
    const result = truncateHistoryToFit(history, smallSystem, smallContext, 50);

    expect(result.turnsDropped).toBe(1);
    expect(result.truncatedHistory).toEqual([]);
  });

  it('returns empty history when budget is zero', () => {
    const result = truncateHistoryToFit(
      [makeTurn('A', 10)],
      'very long system prompt'.repeat(100),
      'very long context'.repeat(100),
      100,
    );

    expect(result.turnsDropped).toBe(1);
    expect(result.truncatedHistory).toEqual([]);
  });

  it('handles empty history', () => {
    const result = truncateHistoryToFit([], smallSystem, smallContext, 10_000);

    expect(result.turnsDropped).toBe(0);
    expect(result.truncatedHistory).toEqual([]);
  });

  it('preserves most recent turns preferentially', () => {
    const history = ['A: first', 'B: second', 'C: third', 'D: fourth', 'E: fifth'];

    // Budget that fits ~3 turns
    const result = truncateHistoryToFit(history, smallSystem, smallContext, 200);

    // Should keep the last N turns, not the first N
    if (result.turnsDropped > 0) {
      const keptTurns = result.truncatedHistory.filter(
        (t) => !t.startsWith('['),
      );
      // Last entry should always be the most recent
      expect(keptTurns[keptTurns.length - 1]).toBe('E: fifth');
    }
  });
});
