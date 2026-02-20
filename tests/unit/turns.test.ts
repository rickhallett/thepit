import { describe, expect, it } from 'vitest';
import {
  resolveTurns,
  TURN_OPTIONS,
  DEFAULT_ARENA_TURNS,
  MIN_TURNS,
  MAX_TURNS,
} from '@/lib/turns';

describe('turns', () => {
  it('returns default for null/undefined', () => {
    expect(resolveTurns(null)).toBe(DEFAULT_ARENA_TURNS);
    expect(resolveTurns(undefined)).toBe(DEFAULT_ARENA_TURNS);
  });

  it('returns default for empty string', () => {
    expect(resolveTurns('')).toBe(DEFAULT_ARENA_TURNS);
  });

  it('resolves valid turn counts from string', () => {
    for (const opt of TURN_OPTIONS) {
      expect(resolveTurns(String(opt.id))).toBe(opt.id);
    }
  });

  it('resolves valid turn counts from number', () => {
    for (const opt of TURN_OPTIONS) {
      expect(resolveTurns(opt.id)).toBe(opt.id);
    }
  });

  it('returns default for invalid turn counts', () => {
    expect(resolveTurns('3')).toBe(DEFAULT_ARENA_TURNS);
    expect(resolveTurns('7')).toBe(DEFAULT_ARENA_TURNS);
    expect(resolveTurns('99')).toBe(DEFAULT_ARENA_TURNS);
    expect(resolveTurns('abc')).toBe(DEFAULT_ARENA_TURNS);
  });

  it('has valid MIN/MAX constants', () => {
    expect(MIN_TURNS).toBe(TURN_OPTIONS[0]!.id);
    expect(MAX_TURNS).toBe(TURN_OPTIONS[TURN_OPTIONS.length - 1]!.id);
  });

  it('default is within range', () => {
    expect(DEFAULT_ARENA_TURNS).toBeGreaterThanOrEqual(MIN_TURNS);
    expect(DEFAULT_ARENA_TURNS).toBeLessThanOrEqual(MAX_TURNS);
  });
});
